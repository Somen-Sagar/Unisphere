import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../database/prisma/prisma.service';
import type { TenantContext } from '../common/tenant-context';
import { EmbeddingService } from './embedding.service';
import { RagService, type RetrievedDocument } from './rag.service';
import { LlmService } from './llm.service';

export type AiChatInput = {
  message: string;
  sessionId?: string;
};

export type AiChatSource = {
  title: string;
  sourceType: string;
  sourceId: string | null;
  similarity: number;
};

export type AiChatResponse = {
  reply: string;
  sources: AiChatSource[];
  sessionId: string;
};

const SYSTEM_PROMPT = `You are UniSphere AI, the official campus assistant for college students.
You answer questions about campus events, student clubs, registrations, college facilities, and guidelines.

CRITICAL RULES:
1. STRICT GROUNDING & PARTIAL KNOWLEDGE: The UniSphere knowledge base contains verified, partial campus information. Answer questions using ONLY the facts explicitly provided in the campus context below.
2. MISSING INFORMATION: If the requested information (such as a specific event, club, venue, schedule, rule, fee, faculty contact, or procedure) is NOT present in the provided context, you MUST explicitly state that the information is currently not available in the campus knowledge base. Do NOT guess, assume, or speculate.
3. NO HALLUCINATION: Never fabricate or extrapolate any event names, dates, times, club names, policies, or contact details.
4. GREETINGS & CASUAL INTERACTION: For greetings or questions about your capabilities, greet the student warmly and explain that you answer campus questions grounded in verified university information.
5. CONCISE & STRUCTURED: Keep responses direct, friendly, and well-structured with bullet points where appropriate.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly ragService: RagService,
    private readonly llmService: LlmService,
  ) {}

  async chat(
    tenant: TenantContext,
    input: AiChatInput,
  ): Promise<AiChatResponse> {
    const sessionId = input.sessionId || this.generateSessionId();

    // 1. Generate embedding for user query
    const queryEmbedding = await this.embeddingService.embed(input.message);

    // 2. Retrieve relevant documents scoped to college
    const documents = await this.ragService.searchSimilar(
      tenant.collegeId,
      queryEmbedding,
      5,
    );

    // 3. Load recent conversation history for multi-turn context
    const history = await this.loadRecentHistory(sessionId, 6);

    // 4. Build prompt with retrieved context
    const contextBlock = this.buildContextBlock(documents);
    const messages = this.buildMessages(
      contextBlock,
      history,
      input.message,
      tenant.college.name,
    );

    // 5. Call LLM for completion
    const reply = await this.llmService.chatCompletion(messages);

    // 6. Extract cited sources with sufficient similarity
    const sources: AiChatSource[] = documents
      .filter((doc) => doc.similarity >= 0.25)
      .map((doc) => ({
        title: doc.title,
        sourceType: doc.sourceType,
        sourceId: doc.sourceId,
        similarity: Math.round(doc.similarity * 100) / 100,
      }));

    // 7. Persist conversation in database
    await this.saveMessages(
      sessionId,
      tenant.collegeId,
      tenant.userId,
      input.message,
      reply,
      sources,
    );

    return { reply, sources, sessionId };
  }

  private buildContextBlock(documents: RetrievedDocument[]): string {
    const relevantDocs = documents.filter((doc) => doc.similarity >= 0.25);

    if (!relevantDocs.length) {
      return `[NOTICE: No matching information found in the current campus knowledge base for this query.]
Instruction: If the student is asking about specific campus data, events, clubs, facilities, or policies, inform them clearly that this information is not currently available in the UniSphere knowledge base. Do not invent any details.`;
    }

    return relevantDocs
      .map(
        (doc, index) =>
          `[Document ${index + 1}: ${doc.title} (${doc.sourceType})]\n${doc.content}\n(Relevance: ${Math.round(doc.similarity * 100)}%)`,
      )
      .join('\n\n');
  }

  private buildMessages(
    context: string,
    history: { role: string; content: string }[],
    userMessage: string,
    collegeName: string,
  ) {
    const systemMessage = {
      role: 'system' as const,
      content: `${SYSTEM_PROMPT}\n\nCollege: ${collegeName}\n\nVerified Campus Context:\n${context}`,
    };

    const conversationHistory = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    return [
      systemMessage,
      ...conversationHistory,
      { role: 'user' as const, content: userMessage },
    ];
  }

  private async loadRecentHistory(
    sessionId: string,
    limit: number,
  ): Promise<{ role: string; content: string }[]> {
    const messages = await this.prisma.aiChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { role: true, content: true },
    });

    return messages.reverse();
  }

  private async saveMessages(
    sessionId: string,
    collegeId: string,
    userId: string,
    userMessage: string,
    assistantReply: string,
    sources: AiChatSource[],
  ): Promise<void> {
    await this.prisma.aiChatMessage.createMany({
      data: [
        {
          sessionId,
          collegeId,
          userId,
          role: 'user',
          content: userMessage,
        },
        {
          sessionId,
          collegeId,
          userId,
          role: 'assistant',
          content: assistantReply,
          sources: JSON.parse(JSON.stringify(sources)),
        },
      ],
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
