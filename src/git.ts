import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git integration for getting changed files context
 */
export class GitManager {
  private gitExtension: vscode.Extension<any> | undefined;

  constructor() {
    this.gitExtension = vscode.extensions.getExtension('vscode.git');
  }

  /**
   * Get list of changed files in the current workspace
   */
  async getChangedFiles(): Promise<string[]> {
    try {
      // First try to use VS Code Git extension API
      if (this.gitExtension && this.gitExtension.isActive) {
        return await this.getChangedFilesFromExtension();
      }

      // Fallback to command line git
      return await this.getChangedFilesFromCli();
    } catch (error) {
      console.warn('Failed to get git changes:', error);
      return [];
    }
  }

  /**
   * Get changed files using VS Code Git extension API
   */
  private async getChangedFilesFromExtension(): Promise<string[]> {
    if (!this.gitExtension || !this.gitExtension.isActive) {
      return [];
    }

    const git = this.gitExtension.exports.getAPI(1);
    if (!git.repositories.length) {
      return [];
    }

    const repo = git.repositories[0];
    const changes = repo.state.workingTreeChanges;

    return changes.map((change: any) => change.uri.fsPath);
  }

  /**
   * Get changed files using command line git
   */
  private async getChangedFilesFromCli(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    try {
      const { stdout } = await execAsync('git diff --name-only HEAD', {
        cwd: workspaceRoot
      });

      return stdout.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      // Try staged and unstaged changes
      try {
        const { stdout: staged } = await execAsync('git diff --name-only --cached', {
          cwd: workspaceRoot
        });
        const { stdout: unstaged } = await execAsync('git diff --name-only', {
          cwd: workspaceRoot
        });

        const stagedFiles = staged.trim().split('\n').filter(file => file.length > 0);
        const unstagedFiles = unstaged.trim().split('\n').filter(file => file.length > 0);

        return [...new Set([...stagedFiles, ...unstagedFiles])];
      } catch (fallbackError) {
        return [];
      }
    }
  }

  /**
   * Get a formatted string describing the changed files
   */
  async getChangedFilesDescription(): Promise<string> {
    const changedFiles = await this.getChangedFiles();

    if (changedFiles.length === 0) {
      return 'Нет изменений в Git.';
    }

    if (changedFiles.length <= 3) {
      return `Изменённые файлы: ${changedFiles.join(', ')}.`;
    }

    return `Изменено ${changedFiles.length} файлов, включая: ${changedFiles.slice(0, 3).join(', ')} и другие.`;
  }
}