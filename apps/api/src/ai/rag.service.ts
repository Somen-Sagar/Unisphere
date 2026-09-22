import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../database/prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

export type RetrievedDocument = {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  metadata: unknown;
  similarity: number;
};

export type IndexResult = {
  status: 'inserted' | 'updated' | 'skipped';
};

export type SyncResult = {
  indexed: number;
  updated: number;
  skipped: number;
  total: number;
};

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Search for the most similar documents in the given college's embeddings.
   */
  async searchSimilar(
    collegeId: string,
    queryEmbedding: number[],
    limit = 5,
  ): Promise<RetrievedDocument[]> {
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const results = await this.prisma.$queryRawUnsafe<RetrievedDocument[]>(
      `SELECT
         id,
         title,
         content,
         "sourceType",
         "sourceId",
         metadata,
         1 - (embedding <=> $1::vector) AS similarity
       FROM document_embeddings
       WHERE "collegeId" = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      collegeId,
      limit,
    );

    return results;
  }

  /**
   * Compute a deterministic SHA-256 hash for document content to allow idempotent checks.
   */
  private computeContentHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Index a single document by checking content hash first.
   * If unchanged, skips embedding generation (idempotent/incremental).
   * If changed, updates embedding. If new, generates embedding and inserts.
   */
  async indexDocument(doc: {
    collegeId: string;
    sourceType: string;
    sourceId: string;
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<IndexResult> {
    const contentHash = this.computeContentHash(doc.content);

    // Check if document already exists for this college, sourceType, and sourceId
    const existing = await this.prisma.$queryRawUnsafe<{ id: string; metadata: any }[]>(
      `SELECT id, metadata FROM document_embeddings
       WHERE "collegeId" = $1 AND "sourceType" = $2 AND "sourceId" = $3
       LIMIT 1`,
      doc.collegeId,
      doc.sourceType,
      doc.sourceId,
    );

    if (existing.length > 0) {
      const existingMeta = existing[0].metadata as Record<string, unknown> | null;
      const existingHash = existingMeta?.contentHash;

      // If content hash matches, document is identical - skip re-embedding!
      if (existingHash === contentHash) {
        return { status: 'skipped' };
      }

      // Content changed, re-compute embedding and update
      const embedding = await this.embeddingService.embed(doc.content);
      const vectorStr = `[${embedding.join(',')}]`;
      const metadataJson = JSON.stringify({
        ...(doc.metadata ?? {}),
        contentHash,
      });

      await this.prisma.$executeRawUnsafe(
        `UPDATE document_embeddings
         SET title = $1, content = $2, embedding = $3::vector,
             metadata = $4::jsonb, "updatedAt" = now()
         WHERE id = $5`,
        doc.title,
        doc.content,
        vectorStr,
        metadataJson,
        existing[0].id,
      );

      return { status: 'updated' };
    }

    // New document: generate embedding and insert
    const embedding = await this.embeddingService.embed(doc.content);
    const vectorStr = `[${embedding.join(',')}]`;
    const metadataJson = JSON.stringify({
      ...(doc.metadata ?? {}),
      contentHash,
    });

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO document_embeddings
         (id, "collegeId", "sourceType", "sourceId", title, content, embedding, metadata, "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, $7::jsonb, now(), now())`,
      doc.collegeId,
      doc.sourceType,
      doc.sourceId,
      doc.title,
      doc.content,
      vectorStr,
      metadataJson,
    );

    return { status: 'inserted' };
  }

  /**
   * Sync all available knowledge for a college:
   * 1. College profile (from PostgreSQL)
   * 2. Events (from PostgreSQL)
   * 3. Clubs (from PostgreSQL)
   * 4. External knowledge documents (from apps/api/knowledge/)
   */
  async syncCollegeData(collegeId: string): Promise<SyncResult> {
    this.logger.log(`Syncing embeddings for college ${collegeId}...`);
    let indexed = 0;
    let updated = 0;
    let skipped = 0;

    const recordResult = (res: IndexResult) => {
      if (res.status === 'inserted') indexed++;
      else if (res.status === 'updated') updated++;
      else if (res.status === 'skipped') skipped++;
    };

    // 1. Index College Profile
    const college = await this.prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (college) {
      const location = [college.address, college.city, college.state, college.country]
        .filter(Boolean)
        .join(', ');

      const content = [
        `University/College: ${college.name}`,
        college.description ? `About: ${college.description}` : '',
        location ? `Location: ${location}` : '',
        college.website ? `Official Website: ${college.website}` : '',
        college.officialEmailDomain ? `Email Domain: @${college.officialEmailDomain}` : '',
        `Status: ${college.status}`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await this.indexDocument({
        collegeId,
        sourceType: 'college',
        sourceId: college.id,
        title: college.name,
        content,
        metadata: { slug: college.slug },
      });
      recordResult(res);
    }

    // 2. Index Events
    const events = await this.prisma.event.findMany({
      where: { collegeId },
      include: { club: true },
    });

    for (const event of events) {
      const content = [
        `Event: ${event.title}`,
        `Description: ${event.description}`,
        `Venue: ${event.venue}`,
        `Date: ${event.startsAt.toISOString()} to ${event.endsAt.toISOString()}`,
        `Status: ${event.status}`,
        event.capacity ? `Capacity: ${event.capacity}` : 'Open capacity',
        event.club ? `Organized by Club: ${event.club.name}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const res = await this.indexDocument({
        collegeId,
        sourceType: 'event',
        sourceId: event.id,
        title: event.title,
        content,
        metadata: {
          venue: event.venue,
          status: event.status,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          clubName: event.club?.name,
        },
      });
      recordResult(res);
    }

    // 3. Index Clubs
    const clubs = await this.prisma.club.findMany({
      where: { collegeId, isActive: true },
    });

    for (const club of clubs) {
      const content = [
        `Student Club: ${club.name}`,
        club.description ? `Description: ${club.description}` : 'A campus student club.',
        `Club Identifier: ${club.slug}`,
      ].join('\n');

      const res = await this.indexDocument({
        collegeId,
        sourceType: 'club',
        sourceId: club.id,
        title: club.name,
        content,
        metadata: { slug: club.slug },
      });
      recordResult(res);
    }

    // 4. Index Knowledge Documents from filesystem
    const knowledgeDocs = this.loadKnowledgeDocuments(college?.slug, collegeId);
    for (const doc of knowledgeDocs) {
      const res = await this.indexDocument({
        collegeId,
        sourceType: 'knowledge_doc',
        sourceId: doc.sourceId,
        title: doc.title,
        content: doc.content,
        metadata: { filename: doc.filename },
      });
      recordResult(res);
    }

    this.logger.log(
      `College ${collegeId} sync complete: ${indexed} inserted, ${updated} updated, ${skipped} skipped (unchanged).`,
    );

    return {
      indexed,
      updated,
      skipped,
      total: indexed + updated + skipped,
    };
  }

  /**
   * Load markdown or text documents from the knowledge directory.
   * Supports files in:
   * - knowledge/ (shared across all colleges)
   * - knowledge/<collegeSlug>/ or knowledge/<collegeId>/
   */
  private loadKnowledgeDocuments(
    collegeSlug?: string,
    collegeId?: string,
  ): Array<{ filename: string; sourceId: string; title: string; content: string }> {
    const results: Array<{ filename: string; sourceId: string; title: string; content: string }> = [];

    const candidateRoots = [
      path.resolve(process.cwd(), 'knowledge'),
      path.resolve(process.cwd(), 'apps/api/knowledge'),
      path.resolve(__dirname, '../../knowledge'),
      path.resolve(__dirname, '../knowledge'),
      path.resolve(__dirname, 'knowledge'),
    ];

    const knowledgeDir = candidateRoots.find((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());
    if (!knowledgeDir) {
      return results;
    }

    const processDirectory = (dirPath: string, prefix = '') => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
            const fileContent = fs.readFileSync(fullPath, 'utf8').trim();
            if (!fileContent) continue;

            // Extract title from first # Header or fallback to filename
            const firstHeaderMatch = fileContent.match(/^#\s+(.+)$/m);
            const title = firstHeaderMatch
              ? firstHeaderMatch[1].trim()
              : entry.name.replace(/\.(md|txt)$/, '').replace(/[-_]/g, ' ');

            const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;
            results.push({
              filename: relativeName,
              sourceId: `file:${relativeName}`,
              title,
              content: fileContent,
            });
          }
        }
      } catch (err) {
        this.logger.warn(`Could not read knowledge directory ${dirPath}: ${err}`);
      }
    };

    // 1. Process root shared knowledge documents
    processDirectory(knowledgeDir);

    // 2. Process college-specific subdirectories if they exist
    const specificDirs = [collegeSlug, collegeId].filter(Boolean) as string[];
    for (const sub of specificDirs) {
      const subDir = path.join(knowledgeDir, sub);
      if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
        processDirectory(subDir, sub);
      }
    }

    return results;
  }
}
