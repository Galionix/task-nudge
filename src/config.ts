import * as vscode from 'vscode';
import { ExtensionConfig } from './types';

/**
 * Configuration manager for Task Nudge extension
 */
export class ConfigManager {
  private static readonly CONFIG_SECTION = 'taskNudge';

  /**
   * Get current extension configuration
   */
  static getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    return {
      enabled: config.get('enabled', true),
      baseIntervalMinutes: config.get('baseIntervalMinutes', 15),
      maxIntervalMinutes: config.get('maxIntervalMinutes', 60),
      idleThresholdSeconds: config.get('idleThresholdSeconds', 180),
      questions: config.get('questions', [
        'Над какой задачей ты сейчас работаешь?',
        'Что тебя сейчас блокирует или затрудняет?',
        'Какой следующий шаг ты планируешь?',
        'К кому можешь обратиться за помощью?',
        'Сколько времени, по твоей оценке, займёт текущая задача?'
      ]),
      openaiApiKey: config.get('openaiApiKey', ''),
      voiceEnabled: config.get('voiceEnabled', true),
      voiceLanguage: config.get('voiceLanguage', 'ru')
    };
  }

  /**
   * Watch for configuration changes
   */
  static onConfigChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(this.CONFIG_SECTION)) {
        callback();
      }
    });
  }
}