/**
 * Standalone script to sync campus data (events, clubs) into the
 * document_embeddings table for RAG retrieval.
 *
 * Usage:
 *   npx ts-node src/ai/sync-embeddings.command.ts
 *
 * Or after building:
 *   node dist/ai/sync-embeddings.command.js
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RagService } from './rag.service';
import { PrismaService } from '../database/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const ragService = app.get(RagService);
  const prisma = app.get(PrismaService);

  console.log('=== UniSphere Embedding Sync ===\n');

  const colleges = await prisma.college.findMany({
    where: { status: 'VERIFIED' },
    select: { id: true, name: true },
  });

  if (!colleges.length) {
    // Fall back to all colleges if none are verified (dev environment)
    const allColleges = await prisma.college.findMany({
      select: { id: true, name: true },
    });
    colleges.push(...allColleges);
  }

  console.log(`Found ${colleges.length} college(s) to sync.\n`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const college of colleges) {
    console.log(`Syncing: ${college.name} (${college.id})`);
    const result = await ragService.syncCollegeData(college.id);
    totalInserted += result.indexed;
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
    console.log(
      `  → Inserted: ${result.indexed} | Updated: ${result.updated} | Skipped (unchanged): ${result.skipped}\n`,
    );
  }

  console.log(
    `\n=== Done! Summary: ${totalInserted} inserted, ${totalUpdated} updated, ${totalSkipped} skipped ===`,
  );

  await app.close();
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('Embedding sync failed:', error);
  process.exit(1);
});
