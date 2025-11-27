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
      questionsEnabled: {
        task: config.get('questionsEnabled.task', true),
        unclear: config.get('questionsEnabled.unclear', true),
        tried: config.get('questionsEnabled.tried', true),
        teammate: config.get('questionsEnabled.teammate', true),
        blocker: config.get('questionsEnabled.blocker', true),
      }
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