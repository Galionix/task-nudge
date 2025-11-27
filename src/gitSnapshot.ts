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
  }> {
    const currentSnapshot = await this.getCurrentSnapshot();
    const lastSnapshot = this.getLastSnapshot();

    if (!lastSnapshot) {
      return {
        hasChanges: currentSnapshot.changedFiles.length > 0,
        newFiles: currentSnapshot.changedFiles,
        changedFilesSinceLastPing: [],
        isStuck: false,
        description: currentSnapshot.summary
      };
    }

    // Сравниваем файлы
    const lastFiles = new Set(lastSnapshot.changedFiles);
    const currentFiles = new Set(currentSnapshot.changedFiles);

    const newFiles = currentSnapshot.changedFiles.filter(file => !lastFiles.has(file));
    const isStuck = this.arraysEqual(lastSnapshot.changedFiles, currentSnapshot.changedFiles);

    let description = '';
    if (isStuck && currentSnapshot.changedFiles.length === 0) {
      description = 'Никаких изменений с последнего раза. Возможно, ты застрял?';
    } else if (isStuck && currentSnapshot.changedFiles.length > 0) {
      description = `Те же файлы что и в прошлый раз: ${currentSnapshot.summary}. Продвижения не видно.`;
    } else if (newFiles.length > 0) {
      description = `Новые изменения: ${newFiles.join(', ')}. ${currentSnapshot.summary}`;
    } else {
      description = currentSnapshot.summary;
    }

    return {
      hasChanges: currentSnapshot.changedFiles.length > 0,
      newFiles,
      changedFilesSinceLastPing: newFiles,
      isStuck,
      description
    };
  }

  /**
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