import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { EmbeddingService } from './embedding.service';
import { LlmService } from './llm.service';
import { RagService } from './rag.service';

@Module({
  controllers: [AiController],
  providers: [AiService, EmbeddingService, LlmService, RagService],
  exports: [RagService],
})
export class AiModule {}
