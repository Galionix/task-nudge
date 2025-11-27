import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { GitManager } from './git';
import { DialogManager } from './dialog';
import { StateManager } from './state';
import { GitSnapshotManager } from './gitSnapshot';
import { SessionState } from './types';

/**
 * Main Task Nudge extension class with voice and ChatGPT integration
 */
export class TaskNudgeExtension {
  private stateManager: StateManager;
  private gitManager: GitManager;
  private gitSnapshotManager: GitSnapshotManager;
  private dialogManager: DialogManager;
  private sessionState: SessionState;
  
  private activityCheckInterval: NodeJS.Timeout | undefined;
  private pingTimeout: NodeJS.Timeout | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.stateManager = new StateManager(context);
    this.gitManager = new GitManager();
    this.gitSnapshotManager = new GitSnapshotManager(context, this.gitManager);
    this.dialogManager = new DialogManager();
    this.sessionState = this.stateManager.loadState();
    
    this.initialize();
  }

  /**
   * Initialize the extension
   */
  private initialize(): void {
    // Update state from current configuration
    this.updateFromConfig();

    // Set up activity tracking
    this.setupActivityTracking();

    // Set up configuration change handler
    this.disposables.push(
      ConfigManager.onConfigChange(() => {
        this.updateFromConfig();
      })
    );

    // Start activity monitoring
    this.startActivityMonitoring();

    console.log('Task Nudge extension activated');
  }

  /**
   * Update state from current configuration
   */
  private updateFromConfig(): void {
    const config = ConfigManager.getConfig();
    this.stateManager.updateIntervalsFromConfig(
      this.sessionState,
      config.baseIntervalMinutes,
      config.maxIntervalMinutes,
      config.idleThresholdSeconds
    );
    this.stateManager.saveState(this.sessionState);
  }

  /**
   * Set up activity tracking listeners
   */
  private setupActivityTracking(): void {
    // Track text document changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => {
        this.updateActivity();
      })
    );

    // Track text editor selection changes
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(() => {
        this.updateActivity();
      })
    );

    // Track active text editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updateActivity();
      })
    );
  }

  /**
   * Update last activity timestamp and cancel pending pings
   */
  private updateActivity(): void {
    this.sessionState.lastActivityAt = Date.now();
    this.cancelScheduledPing();
  }

  /**
   * Start monitoring for idle periods
   */
  private startActivityMonitoring(): void {
    // Check every 10 seconds for idle periods
    this.activityCheckInterval = setInterval(() => {
      this.checkForIdlePeriod();
    }, 10000);
  }

  /**
   * Check if user has been idle and schedule ping if necessary
   */
  private checkForIdlePeriod(): void {
    const config = ConfigManager.getConfig();
    
    if (!config.enabled) {
      return;
    }

    const now = Date.now();
    const timeSinceActivity = now - this.sessionState.lastActivityAt;

    // If idle threshold exceeded and no ping scheduled
    if (timeSinceActivity >= this.sessionState.idleThresholdMs && !this.pingTimeout) {
      this.schedulePing();
    }
  }

  /**
   * Schedule a ping after the current interval
   */
  private schedulePing(): void {
    this.sessionState.pingScheduledAt = Date.now() + this.sessionState.currentIntervalMs;
    
    this.pingTimeout = setTimeout(() => {
      this.showPing();
    }, this.sessionState.currentIntervalMs);

    console.log(`Ping scheduled in ${this.sessionState.currentIntervalMs / 1000} seconds`);
  }

  /**
   * Cancel any scheduled ping
   */
  private cancelScheduledPing(): void {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = undefined;
      this.sessionState.pingScheduledAt = null;
      console.log('Scheduled ping cancelled due to activity');
    }
  }

  /**
   * Show the ping dialog with Git analysis and voice integration
   */
  private async showPing(): Promise<void> {
    this.pingTimeout = undefined;
    this.sessionState.pingScheduledAt = null;

    try {
      const config = ConfigManager.getConfig();
      
      // Analyze Git changes since last ping
      const gitAnalysis = await this.gitSnapshotManager.compareWithLast();
      
      // Show dialog with voice and ChatGPT integration
      const dialogResult = await this.dialogManager.showPingDialog(config, {
        isStuck: gitAnalysis.isStuck,
        description: gitAnalysis.description,
        hasChanges: gitAnalysis.hasChanges
      });
      
      if (dialogResult) {
        // Update session state with results
        this.stateManager.updateStateFromDialog(this.sessionState, dialogResult);
        await this.stateManager.saveState(this.sessionState);
        
        // Save current Git snapshot for next comparison
        await this.gitSnapshotManager.saveCurrentSnapshot();
        
        console.log(`Updated session state. New interval: ${this.sessionState.currentIntervalMs / 1000}s, Waiting: ${this.sessionState.isWaiting}`);
      }
    } catch (error) {
      console.error('Error showing ping dialog:', error);
      await this.dialogManager.showNotification('Ошибка при показе диалога Task Nudge', 'error');
    }
  }

  /**
   * Manually trigger a ping (for the command)
   */
  public async triggerPingNow(): Promise<void> {
    this.cancelScheduledPing();
    await this.showPing();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clear timers
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }
    this.cancelScheduledPing();

    // Dispose of event listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];

    console.log('Task Nudge extension deactivated');
  }
}

// Global extension instance
let taskNudgeExtension: TaskNudgeExtension | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Create extension instance
  taskNudgeExtension = new TaskNudgeExtension(context);

  // Register command for manual ping
  const checkNowCommand = vscode.commands.registerCommand('task-nudge.checkNow', () => {
    taskNudgeExtension?.triggerPingNow();
  });

  context.subscriptions.push(checkNowCommand);
  
  // Ensure cleanup on deactivation
  context.subscriptions.push({
    dispose: () => {
      taskNudgeExtension?.dispose();
      taskNudgeExtension = undefined;
    }
  });
}

export function deactivate() {
  taskNudgeExtension?.dispose();
  taskNudgeExtension = undefined;
}