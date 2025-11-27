import * as vscode from 'vscode';
import { ExtensionConfig, QuestionDialogResult, BlockerType } from './types';
import { OpenAIManager } from './openai';
import { VoiceManager } from './voice';

/**
 * Dialog manager for user interaction with voice and ChatGPT integration
 */
export class DialogManager {
  private openaiManager: OpenAIManager;
  private voiceManager: VoiceManager;

  constructor() {
    this.openaiManager = new OpenAIManager(''); // Will be set from config
    this.voiceManager = new VoiceManager();
  }

  /**
   * Update OpenAI API key from configuration
   */
  updateOpenAIKey(apiKey: string): void {
    this.openaiManager = new OpenAIManager(apiKey);
    this.voiceManager.updateApiKey(apiKey); // Также передаём в VoiceManager
  }

  /**
   * Show the main ping dialog with voice integration
   */
  async showPingDialog(
    config: ExtensionConfig,
    gitAnalysis: {
      isStuck: boolean;
      description: string;
      hasChanges: boolean;
    }
  ): Promise<QuestionDialogResult | undefined> {

    // Update OpenAI key from config
    this.updateOpenAIKey(config.openaiApiKey);

    // Generate personalized opening message
    const openingMessage = await this.openaiManager.generateOpeningMessage(gitAnalysis);

    // Speak the opening message if voice is enabled
    if (config.voiceEnabled) {
      await this.voiceManager.speakOpeningMessage(openingMessage, config.voiceLanguage);
    }

    // Show confirmation dialog with the generated message
    const response = await vscode.window.showInformationMessage(
      `${openingMessage}\n\nОтветишь на пару вопросов?`,
      { modal: false },
      'Да, отвечу',
      'Отложить на 15 мин',
      'Отключить на час'
    );

    if (!response || response !== 'Да, отвечу') {
      return undefined;
    }

    // Ask questions in chat-like interface
    const answers = await this.askQuestionsInSequence(config.questions);
    if (!answers) {
      return undefined;
    }

    // Determine blocker type based on answers
    const blockerType = await this.determineBlockerType();

    // Analyze answers and provide encouragement
    await this.analyzeAndEncourage(config, answers);

    return {
      answers,
      blockerType
    };
  }

  /**
   * Ask questions in sequence using input boxes
   */
  private async askQuestionsInSequence(questions: string[]): Promise<string[] | undefined> {
    const answers: string[] = [];

    for (const question of questions) {
      const answer = await vscode.window.showInputBox({
        prompt: question,
        placeHolder: 'Твой ответ...',
        ignoreFocusOut: true,
        value: '' // Start with empty input
      });

      if (answer === undefined) {
        // User cancelled
        return undefined;
      }

      answers.push(answer || '(пропущено)');
    }

    return answers;
  }

  /**
   * Determine blocker type from user selection
   */
  private async determineBlockerType(): Promise<BlockerType> {
    const blockerChoice = await vscode.window.showQuickPick([
      {
        label: 'Продолжаю работать самостоятельно',
        detail: 'Ничего не блокирует',
        blockerType: 'none' as BlockerType
      },
      {
        label: 'Жду ответа от коллег / ревью',
        detail: 'Ожидание обратной связи от команды',
        blockerType: 'waiting_for_person' as BlockerType
      },
      {
        label: 'Жду деплой / CI / внешние процессы',
        detail: 'Ожидание автоматизированных процессов',
        blockerType: 'waiting_for_process' as BlockerType
      },
      {
        label: 'Другая блокировка',
        detail: 'Что-то ещё мешает работе',
        blockerType: 'other' as BlockerType
      }
    ], {
      placeHolder: 'Что сейчас блокирует твою работу?',
      ignoreFocusOut: true
    });

    return blockerChoice?.blockerType || 'none';
  }

  /**
   * Analyze answers and provide encouraging response
   */
  private async analyzeAndEncourage(config: ExtensionConfig, answers: string[]): Promise<void> {
    // Debug output: show developer's answers
    const outputChannel = vscode.window.createOutputChannel('Task Nudge Debug');
    outputChannel.show(true);
    outputChannel.appendLine(`=== Ответы разработчика [${new Date().toLocaleTimeString()}] ===`);

    for (let i = 0; i < config.questions.length && i < answers.length; i++) {
      outputChannel.appendLine(`Q: ${config.questions[i]}`);
      outputChannel.appendLine(`A: ${answers[i]}`);
      outputChannel.appendLine('');
    }

    // Generate encouraging response
    const encouragement = await this.openaiManager.analyzeAnswersAndEncourage(
      config.questions,
      answers
    );

    // Speak encouragement if voice is enabled
    if (config.voiceEnabled) {
      await this.voiceManager.speakEncouragement(encouragement, config.voiceLanguage);
    }

    // Also show as notification for visibility
    await vscode.window.showInformationMessage(
      `💪 ${encouragement}`,
      { modal: false }
    );

    // Debug output: show AI response
    outputChannel.appendLine(`AI Encouragement: ${encouragement}`);
    outputChannel.appendLine('='.repeat(50));
  }

  /**
   * Show a simple notification
   */
  async showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    switch (type) {
      case 'warning':
        await vscode.window.showWarningMessage(message);
        break;
      case 'error':
        await vscode.window.showErrorMessage(message);
        break;
      default:
        await vscode.window.showInformationMessage(message);
    }
  }
}