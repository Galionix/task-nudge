import * as vscode from 'vscode';
import { ExtensionConfig, QuestionDialogResult, BlockerType } from './types';
import { OpenAIManager } from './openai';
import { VoiceManager } from './voice';
import { ChatViewProvider } from './chatViewProvider';

/**
 * Dialog manager for user interaction with voice and ChatGPT integration
 */
export class DialogManager {
  private openaiManager: OpenAIManager;
  private voiceManager: VoiceManager;
  private context: vscode.ExtensionContext;
  private chatViewProvider: ChatViewProvider | undefined;

  constructor(context: vscode.ExtensionContext, chatViewProvider?: ChatViewProvider) {
    this.openaiManager = new OpenAIManager(''); // Will be set from config
    this.voiceManager = new VoiceManager();
    this.context = context;
    this.chatViewProvider = chatViewProvider;
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
      detailedInfo?: string;
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
      `${openingMessage}\n\nWould you like to answer a few questions?`,
      { modal: false },
      'Yes, I will answer',
      'Postpone for 15 min',
      'Disable for 1 hour'
    );

    if (!response || response !== 'Yes, I will answer') {
      return undefined;
    }

    // Show sidebar chat panel
    await vscode.commands.executeCommand('workbench.view.extension.task-nudge-sidebar');

    // Update OpenAI key in chat provider and show analysis there
    if (this.chatViewProvider) {
      this.chatViewProvider.updateOpenAIKey(config.openaiApiKey);

      if (gitAnalysis.detailedInfo) {
        await this.chatViewProvider.addCollapsibleMessage(
          '📊 Git Analysis (comparison with previous survey)',
          gitAnalysis.detailedInfo
        );
      }
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
  }  /**
   * Ask questions in sequence using input boxes with "Don't know" option
   */
  private async askQuestionsInSequence(questions: string[]): Promise<string[] | undefined> {
    const answers: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Show question with buttons for "Don't know"
      const choice = await vscode.window.showQuickPick([
        {
          label: '✍️ Type answer',
          detail: 'I know the answer to this question',
          action: 'input'
        },
        {
          label: '🤷 Don\'t know',
          detail: 'I\'m not sure how to answer this question',
          action: 'unknown'
        }
      ], {
        placeHolder: question,
        ignoreFocusOut: true
      });

      if (!choice) {
        // User cancelled
        return undefined;
      }

      if (choice.action === 'unknown') {
        answers.push('Don\'t know');
      } else {
        // Ask for detailed answer
        const answer = await vscode.window.showInputBox({
          prompt: question,
          placeHolder: 'Your answer...',
          ignoreFocusOut: true,
          value: ''
        });

        if (answer === undefined) {
          // User cancelled
          return undefined;
        }

        answers.push(answer || '(пропущено)');
      }
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
   * Analyze answers and provide encouraging response with chat integration
   */
  private async analyzeAndEncourage(config: ExtensionConfig, answers: string[]): Promise<void> {
    // Show chat panel
    await vscode.commands.executeCommand('workbench.view.extension.task-nudge-sidebar');

    // Update OpenAI key in chat provider
    if (this.chatViewProvider) {
      this.chatViewProvider.updateOpenAIKey(config.openaiApiKey);

      // Add debug output to chat: show developer's answers
      await this.chatViewProvider.addSystemMessage('=== Survey Results ===');

      for (let i = 0; i < config.questions.length && i < answers.length; i++) {
        await this.chatViewProvider.addDebugMessage(`Q: ${config.questions[i]}`);
        await this.chatViewProvider.addDebugMessage(`A: ${answers[i]}`);
      }
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

    // Add AI response to chat
    if (this.chatViewProvider) {
      await this.chatViewProvider.addAssistantMessage(encouragement);

      // Check for "don't know" answers and provide additional help
      const unknownCount = answers.filter(answer =>
        answer.toLowerCase().includes('don\'t know') ||
        answer === '(skipped)'
      ).length;

      if (unknownCount > 0) {
        const helpMessage = `I see that you answered "don't know" to ${unknownCount} question(s). Feel free to ask questions in the chat - I'll help you figure it out! 💪`;
        await this.chatViewProvider.addSystemMessage(helpMessage);
      } else {
        await this.chatViewProvider.addSystemMessage('Great answers! If you have any questions - just chat with me.');
      }
    }
  }  /**
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