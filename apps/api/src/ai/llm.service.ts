import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatCompletionResponse = {
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ConfigService<Environment>) {
    this.baseUrl = config
      .get('LLM_BASE_URL', { infer: true })!
      .replace(/\/$/, '');
    this.apiKey = config.get('LLM_API_KEY', { infer: true }) ?? '';
    this.model = config.get('LLM_MODEL', { infer: true })!;
  }

  /**
   * Send a chat completion request to the OpenAI-compatible FreeLLMAPI.
   */
  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const body = JSON.stringify({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(
          `LLM API returned ${response.status}: ${errorText}`,
        );
        throw new Error(
          `AI service returned an error (${response.status}). Please try again.`,
        );
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('The AI did not return a response. Please try again.');
      }

      return content.trim();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.logger.error('LLM API is unreachable', error);
        throw new Error(
          'The AI service is currently unavailable. Please ensure FreeLLMAPI is running.',
        );
      }
      throw error;
    }
  }
}
