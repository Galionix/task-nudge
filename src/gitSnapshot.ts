import * as vscode from 'vscode';
import { GitSnapshot } from './types';
import { GitManager } from './git';

/**
 * Manages Git snapshots for comparison between pings
 */
export class GitSnapshotManager {
  private context: vscode.ExtensionContext;
  private gitManager: GitManager;

  constructor(context: vscode.ExtensionContext, gitManager: GitManager) {
    this.context = context;
    this.gitManager = gitManager;
  }

  /**
   * Get current Git snapshot
   */
  async getCurrentSnapshot(): Promise<GitSnapshot> {
    const changedFiles = await this.gitManager.getChangedFiles();
    const summary = await this.gitManager.getChangedFilesDescription();

    return {
      timestamp: Date.now(),
      changedFiles,
      additions: 0, // TODO: можно добавить подсчёт строк
      deletions: 0,
      summary
    };
  }

  /**
   * Get last saved snapshot
   */
  getLastSnapshot(): GitSnapshot | undefined {
    const stored = this.context.workspaceState.get<GitSnapshot>('taskNudge.lastGitSnapshot');
    return stored;
  }

  /**
   * Save current snapshot
   */
  async saveCurrentSnapshot(): Promise<GitSnapshot> {
    const snapshot = await this.getCurrentSnapshot();
    await this.context.workspaceState.update('taskNudge.lastGitSnapshot', snapshot);
    return snapshot;
  }

  /**
   * Compare current state with last snapshot
   */
  async compareWithLast(): Promise<{
    hasChanges: boolean;
    newFiles: string[];
    changedFilesSinceLastPing: string[];
    isStuck: boolean; // true если diff не изменился с последнего раза
    description: string;
    detailedInfo: string; // Детальная информация о сравнении
  }> {
    const currentSnapshot = await this.getCurrentSnapshot();
    const lastSnapshot = this.getLastSnapshot();

    if (!lastSnapshot) {
      const detailedInfo = `Первый анализ Git состояния:\n- Файлов изменено: ${currentSnapshot.changedFiles.length}\n- Список: ${currentSnapshot.changedFiles.join(', ') || 'нет изменений'}`;

      return {
        hasChanges: currentSnapshot.changedFiles.length > 0,
        newFiles: currentSnapshot.changedFiles,
        changedFilesSinceLastPing: [],
        isStuck: false,
        description: currentSnapshot.summary,
        detailedInfo
      };
    }

    // Сравниваем файлы
    const lastFiles = new Set(lastSnapshot.changedFiles);
    const currentFiles = new Set(currentSnapshot.changedFiles);

    const newFiles = currentSnapshot.changedFiles.filter(file => !lastFiles.has(file));
    const removedFiles = lastSnapshot.changedFiles.filter(file => !currentFiles.has(file));
    const isStuck = this.arraysEqual(lastSnapshot.changedFiles, currentSnapshot.changedFiles);

    // Строим детальную информацию
    let detailedInfo = `📊 Change Statistics:\n`;
    detailedInfo += `• Files in diff before: ${lastSnapshot.changedFiles.length}\n`;
    detailedInfo += `• Files in diff now: ${currentSnapshot.changedFiles.length}\n\n`;

    if (newFiles.length > 0) {
      detailedInfo += `✅ New changes (${newFiles.length}):\n`;
      newFiles.forEach(file => {
        detailedInfo += `  • ${file}\n`;
      });
      detailedInfo += '\n';
    }

    if (removedFiles.length > 0) {
      detailedInfo += `❌ Removed from diff (${removedFiles.length}):\n`;
      removedFiles.forEach(file => {
        detailedInfo += `  • ${file}\n`;
      });
      detailedInfo += '\n';
    }

    if (currentSnapshot.changedFiles.length > 0 && newFiles.length === 0 && removedFiles.length === 0) {
      detailedInfo += `📝 Same files as before:\n`;
      currentSnapshot.changedFiles.forEach(file => {
        detailedInfo += `  • ${file}\n`;
      });
      detailedInfo += '\n';
    }

    if (isStuck) {
      detailedInfo += `⚠️ STATUS: Same changes, no progress`;
    } else {
      detailedInfo += `✅ STATUS: Progress detected!`;
    }

    detailedInfo += `\n\n🕐 Last survey time: ${new Date(lastSnapshot.timestamp).toLocaleString()}`;

    if (currentSnapshot.summary) {
      detailedInfo += `\n\n📋 Brief description: ${currentSnapshot.summary}`;
    }

    // Добавляем детальный diff
    try {
      const detailedDiff = await this.gitManager.getDetailedDiff();
      if (detailedDiff && detailedDiff !== 'No changes to display.' && detailedDiff !== 'Could not get detailed diff.') {
        detailedInfo += `\n\n🔍 Detailed changes:\n${detailedDiff}`;
      }
    } catch (error) {
      console.warn('Failed to get detailed diff for snapshot:', error);
    }

    let description = '';
    if (isStuck && currentSnapshot.changedFiles.length === 0) {
      description = 'No changes since last time. Are you stuck?';
    } else if (isStuck && currentSnapshot.changedFiles.length > 0) {
      description = `Same files as last time: ${currentSnapshot.summary}. No progress visible.`;
    } else if (newFiles.length > 0) {
      description = `New changes: ${newFiles.join(', ')}. ${currentSnapshot.summary}`;
    } else {
      description = currentSnapshot.summary;
    }

    return {
      hasChanges: currentSnapshot.changedFiles.length > 0,
      newFiles,
      changedFilesSinceLastPing: newFiles,
      isStuck,
      description,
      detailedInfo
    };
  }  /**
   * Helper to compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  }
}