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
        return 'I see you\'re stuck - nothing has changed in the code for a while.';
      } else if (gitAnalysis.hasChanges) {
        return `I see you\'re making changes: ${gitAnalysis.description}`;
      } else {
        return 'Looks like you haven\'t been coding for a while.';
      }
    }

    const prompt = this.buildOpeningPrompt(gitAnalysis);
    const response = await this.callOpenAI([
      { role: 'system', content: 'You are a friendly developer assistant. Speak briefly, in English, without formalities.' },
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

    // Определяем настроение из ответов
    const moodAnswer = this.findMoodAnswer(questions, answers);
    const prompt = this.buildAnalysisPrompt(questions, answers, moodAnswer);

    const systemPrompt = this.buildSystemPromptWithMood(moodAnswer);

    const response = await this.callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]);

    return response || this.getFallbackEncouragement(answers);
  }

  /**
   * Find mood answer in responses
   */
  private findMoodAnswer(questions: string[], answers: string[]): string {
    for (let i = 0; i < questions.length && i < answers.length; i++) {
      if (questions[i].toLowerCase().includes('настроение')) {
        return answers[i];
      }
    }
    return '';
  }

  /**
   * Build system prompt considering mood
   */
  private buildSystemPromptWithMood(moodAnswer: string): string {
    let basePrompt = 'Ты - опытный ментор разработчиков. Проанализируй ответы и дай короткий подбадривающий совет на русском языке.';

    if (moodAnswer) {
      const mood = moodAnswer.toLowerCase();
      if (mood.includes('плохо') || mood.includes('грустн') || mood.includes('устал') || mood.includes('депресс')) {
        basePrompt += ' ВАЖНО: Разработчик в плохом настроении, будь особенно поддерживающим и мотивирующим.';
      } else if (mood.includes('хорошо') || mood.includes('отлично') || mood.includes('весел') || mood.includes('бодр')) {
        basePrompt += ' Разработчик в хорошем настроении, поддержи эту энергию!';
      } else if (mood.includes('нормально') || mood.includes('обычно')) {
        basePrompt += ' Разработчик в нейтральном настроении, мотивируй на продуктивность.';
      }
    }

    return basePrompt;
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
  private buildAnalysisPrompt(questions: string[], answers: string[], moodAnswer?: string): string {
    let prompt = 'Проанализируй ответы разработчика на вопросы и дай короткий подбадривающий совет:\n\n';

    for (let i = 0; i < questions.length && i < answers.length; i++) {
      prompt += `Вопрос: ${questions[i]}\nОтвет: ${answers[i]}\n\n`;
    }

    // Добавляем особые инструкции для ответов "не знаю"
    const unknownAnswers = answers.filter(answer =>
      answer.toLowerCase().includes('не знаю') ||
      answer.toLowerCase().includes('незнаю') ||
      answer === '(пропущено)'
    );

    if (unknownAnswers.length > 0) {
      prompt += `\nОсобое внимание: разработчик ответил "не знаю" на ${unknownAnswers.length} вопрос(ов). Дай конкретные советы и подскажи к кому можно обратиться за помощью.\n`;
    }

    if (moodAnswer) {
      prompt += `\nНастроение разработчика: ${moodAnswer}. Учти это в тоне ответа.\n`;
    }

    prompt += '\nОтвет должен быть:\n- Коротким (1-2 предложения)\n- Подбадривающим\n- Конструктивным\n- На русском языке\n- С конкретными советами для "не знаю" ответов';

    return prompt;
  }

  /**
   * Generate chat response for general conversation
   */
  async generateChatResponse(messages: OpenAIMessage[]): Promise<string> {
    if (!this.isConfigured()) {
      return 'OpenAI API key is required for full communication. Please configure it in extension settings.';
    }

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
          max_tokens: 300,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        console.error('OpenAI Chat API error:', response.status, response.statusText);
        return 'Error calling OpenAI API. Check your API key and internet connection.';
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content?.trim() || 'Could not get response from AI.';
    } catch (error) {
      console.error('OpenAI Chat API call failed:', error);
      return 'Error connecting to OpenAI. Check your settings.';
    }
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
      return 'Looks like you\'re stuck in the code. Maybe take a break or ask for help?';
    } else if (gitAnalysis.hasChanges) {
      return `I see activity in the code: ${gitAnalysis.description}. How are things with the task?`;
    } else {
      return 'Haven\'t seen code changes in a while. Is everything okay with the task?';
    }
  }

  /**
   * Fallback encouragement when API is not available
   */
  private getFallbackEncouragement(answers: string[]): string {
    const encouragements = [
      'Sounds like a plan! Good luck with implementation!',
      'Great that you know who to reach out to. Go for it!',
      'The task seems challenging, but you can handle it!',
      'Step-by-step approach is the right way. Good luck!',
      'Excellent work! Keep up the momentum!'
    ];

    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }
}