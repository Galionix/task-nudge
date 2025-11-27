import * as vscode from 'vscode';
import { ExtensionConfig, QuestionDialogResult, BlockerType } from './types';
import { GitManager } from './git';

/**
 * Dialog manager for user interaction
 */
export class DialogManager {
  constructor(private gitManager: GitManager) {}

  /**
   * Show the main ping dialog to the user
   */
  async showPingDialog(config: ExtensionConfig, gitChanges: string): Promise<QuestionDialogResult | undefined> {
    // First, show confirmation dialog
    const response = await vscode.window.showInformationMessage(
      `Кажется, ты подзавис. ${gitChanges}\n\nОтветишь на пару вопросов?`,
      { modal: false },
      'Ответить',
      'Отложить на 15 мин',
      'Отключить на час'
    );

    if (!response || response !== 'Ответить') {
      return undefined;
    }

    // Collect answers to enabled questions
    const result: Partial<QuestionDialogResult> = {};

    // Question 1: Task description
    if (config.questionsEnabled.task) {
      result.taskDescription = await vscode.window.showInputBox({
        prompt: 'Что за задача / тикет?',
        placeHolder: 'Описание текущей задачи...',
        ignoreFocusOut: true
      });
    }

    // Question 2: What's unclear
    if (config.questionsEnabled.unclear) {
      result.unclear = await vscode.window.showInputBox({
        prompt: 'Что тебе непонятно?',
        placeHolder: 'Что именно вызывает затруднения...',
        ignoreFocusOut: true
      });
    }

    // Question 3: What was tried
    if (config.questionsEnabled.tried) {
      result.tried = await vscode.window.showInputBox({
        prompt: 'Что ты уже пробовал?',
        placeHolder: 'Какие подходы уже испробованы...',
        ignoreFocusOut: true
      });
    }

    // Question 4: Team member to ask
    if (config.questionsEnabled.teammate) {
      result.teammate = await vscode.window.showInputBox({
        prompt: 'К кому из команды ты можешь пойти с этим?',
        placeHolder: 'Имя коллеги или роль...',
        ignoreFocusOut: true
      });
    }

    // Question 5: Blocker type (most important for interval adjustment)
    if (config.questionsEnabled.blocker) {
      const blockerChoice = await vscode.window.showQuickPick([
        {
          label: 'Продолжаю работать, ничего не блокирует',
          detail: 'Работаю самостоятельно',
          blockerType: 'none' as BlockerType
        },
        {
          label: 'Жду ответа от коллег / ревью',
          detail: 'Ожидание обратной связи от команды',
          blockerType: 'waiting_for_person' as BlockerType
        },
        {
          label: 'Жду деплой / CI / внешнюю систему',
          detail: 'Ожидание процессов или внешних систем',
          blockerType: 'waiting_for_process' as BlockerType
        },
        {
          label: 'Другое',
          detail: 'Другой тип блокировки',
          blockerType: 'other' as BlockerType
        }
      ], {
        placeHolder: 'Что тебя сейчас блокирует?',
        ignoreFocusOut: true
      });

      if (blockerChoice) {
        result.blockerType = blockerChoice.blockerType;

        // If "other" was selected, ask for details
        if (blockerChoice.blockerType === 'other') {
          result.blocker = await vscode.window.showInputBox({
            prompt: 'Опиши, что именно блокирует:',
            placeHolder: 'Детали блокировки...',
            ignoreFocusOut: true
          });
        }
      } else {
        result.blockerType = 'none';
      }
    } else {
      result.blockerType = 'none';
    }

    return result as QuestionDialogResult;
  }

  /**
   * Show a simple notification
   */
  async showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info') {
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