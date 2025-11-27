import { OpenAIMessage } from './types';

/**
 * OpenAI integration for generating personalized messages and analyzing responses
 */
export class OpenAIManager {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Generate opening message based on Git analysis
   */
  async generateOpeningMessage(gitAnalysis: {
    isStuck: boolean;
    description: string;
    hasChanges: boolean;
  }): Promise<string> {
    if (!this.isConfigured()) {
      // Fallback messages if no API key
      if (gitAnalysis.isStuck) {
        return 'Я вижу что ты застрял - давно ничего не менялось в коде.';
      } else if (gitAnalysis.hasChanges) {
        return `Я вижу ты делаешь изменения: ${gitAnalysis.description}`;
      } else {
        return 'Кажется, ты давно не писал код.';
      }
    }

    const prompt = this.buildOpeningPrompt(gitAnalysis);
    const response = await this.callOpenAI([
      { role: 'system', content: 'Ты - дружелюбный ассистент разработчика. Говори коротко, по-русски, без формальностей.' },
      { role: 'user', content: prompt }
    ]);

    return response || this.getFallbackOpeningMessage(gitAnalysis);
  }

  /**
   * Analyze developer answers and generate encouraging response
   */
  async analyzeAnswersAndEncourage(questions: string[], answers: string[]): Promise<string> {
    if (!this.isConfigured()) {
      return this.getFallbackEncouragement(answers);
    }

    const prompt = this.buildAnalysisPrompt(questions, answers);
    const response = await this.callOpenAI([
      { role: 'system', content: 'Ты - опытный ментор разработчиков. Проанализируй ответы и дай короткий подбадривающий совет на русском языке.' },
      { role: 'user', content: prompt }
    ]);

    return response || this.getFallbackEncouragement(answers);
  }

  /**
   * Build prompt for opening message generation
   */
  private buildOpeningPrompt(gitAnalysis: {
    isStuck: boolean;
    description: string;
    hasChanges: boolean;
  }): string {
    let basePrompt = 'Сгенерируй короткое дружелюбное сообщение (1-2 предложения) для разработчика на основе анализа его Git активности:\n\n';

    if (gitAnalysis.isStuck) {
      basePrompt += `Разработчик застрял - изменения в коде не появляются или повторяются. ${gitAnalysis.description}`;
    } else if (gitAnalysis.hasChanges) {
      basePrompt += `Разработчик активно работает: ${gitAnalysis.description}`;
    } else {
      basePrompt += 'Разработчик давно не вносил изменения в код.';
    }

    basePrompt += '\n\nСообщение должно быть:\n- Дружелюбным\n- Мотивирующим\n- На русском языке\n- Без "я вижу что"\n- Максимум 2 предложения';

    return basePrompt;
  }

  /**
   * Build prompt for answer analysis
   */
  private buildAnalysisPrompt(questions: string[], answers: string[]): string {
    let prompt = 'Проанализируй ответы разработчика на вопросы и дай короткий подбадривающий совет:\n\n';

    for (let i = 0; i < questions.length && i < answers.length; i++) {
      prompt += `Вопрос: ${questions[i]}\nОтвет: ${answers[i]}\n\n`;
    }

    prompt += 'Ответ должен быть:\n- Коротким (1-2 предложения)\n- Подбадривающим\n- Конструктивным\n- На русском языке\n- Без повторения вопросов';

    return prompt;
  }

  /**
   * Make API call to OpenAI
   */
  private async callOpenAI(messages: OpenAIMessage[]): Promise<string | null> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        console.error('OpenAI API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      return null;
    }
  }

  /**
   * Fallback opening message when API is not available
   */
  private getFallbackOpeningMessage(gitAnalysis: {
    isStuck: boolean;
    description: string;
    hasChanges: boolean;
  }): string {
    if (gitAnalysis.isStuck) {
      return 'Кажется, ты застрял в коде. Может, стоит взять паузу или попросить помощи?';
    } else if (gitAnalysis.hasChanges) {
      return `Вижу активность в коде: ${gitAnalysis.description}. Как дела с задачей?`;
    } else {
      return 'Давно не видел изменений в коде. Всё в порядке с задачей?';
    }
  }

  /**
   * Fallback encouragement when API is not available
   */
  private getFallbackEncouragement(answers: string[]): string {
    const encouragements = [
      'Звучит как план! Удачи в реализации!',
      'Хорошо что ты знаешь к кому обратиться. Вперёд!',
      'Задача кажется сложной, но ты справишься!',
      'Пошаговый подход - это правильно. Удачи!',
      'Отличная работа! Продолжай в том же духе!'
    ];

    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }
}