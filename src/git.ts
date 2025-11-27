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
      return 'No changes in Git.';
    }

    if (changedFiles.length <= 3) {
      return `Changed files: ${changedFiles.join(', ')}.`;
    }

    return `${changedFiles.length} files changed, including: ${changedFiles.slice(0, 3).join(', ')} and others.`;
  }

  /**
   * Get detailed diff for changed files
   */
  async getDetailedDiff(): Promise<string> {
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        return 'No open workspace.';
      }

      // Get staged and unstaged changes
      const { stdout: stagedDiff } = await execAsync('git diff --cached --stat', {
        cwd: workspaceRoot
      });

      const { stdout: unstagedDiff } = await execAsync('git diff --stat', {
        cwd: workspaceRoot
      });

      let result = '';

      if (stagedDiff.trim()) {
        result += '📋 Staged changes:\n';
        result += this.formatDiffStat(stagedDiff) + '\n';
      }

      if (unstagedDiff.trim()) {
        result += '📝 Unstaged changes:\n';
        result += this.formatDiffStat(unstagedDiff) + '\n';
      }

      if (!result) {
        result = 'No changes to display.';
      }

      return result.trim();
    } catch (error) {
      console.warn('Failed to get detailed diff:', error);
      return 'Could not get detailed diff.';
    }
  }

  /**
   * Format git diff --stat output
   */
  private formatDiffStat(diffStat: string): string {
    const lines = diffStat.trim().split('\n');
    let result = '';

    for (const line of lines) {
      if (line.includes('|')) {
        // Parse file stats line: "file.ts | 5 ++---"
        const parts = line.split('|');
        if (parts.length >= 2) {
          const fileName = parts[0].trim();
          const stats = parts[1].trim();

          // Extract additions and deletions
          const additionsMatch = stats.match(/(\d+) \+/);
          const deletionsMatch = stats.match(/(\d+) -/);
          const additions = additionsMatch ? parseInt(additionsMatch[1]) : 0;
          const deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;

          result += `  • ${fileName}`;
          if (additions > 0) {
            result += ` (+${additions})`;
          }
          if (deletions > 0) {
            result += ` (-${deletions})`;
          }
          result += '\n';
        }
      } else if (line.includes('file') && (line.includes('changed') || line.includes('insertion') || line.includes('deletion'))) {
        // Summary line like "1 file changed, 5 insertions(+), 2 deletions(-)"
        result += `📊 ${line}\n`;
      }
    }

    return result;
  }
}