import * as vscode from 'vscode';
import { SessionState, BlockerType, QuestionDialogResult } from './types';

/**
 * Manages extension state persistence
 */
export class StateManager {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Load session state from workspace storage
   */
  loadState(): SessionState {
    const stored = this.context.workspaceState.get<Partial<SessionState>>('taskNudge.sessionState', {});
    
    return {
      lastTaskDescription: stored.lastTaskDescription,
      lastUnclear: stored.lastUnclear,
      lastTried: stored.lastTried,
      lastTeammate: stored.lastTeammate,
      lastBlocker: stored.lastBlocker,
      blockerType: stored.blockerType || 'none',
      isWaiting: stored.isWaiting || false,
      baseIntervalMs: stored.baseIntervalMs || 15 * 60 * 1000, // 15 minutes
      currentIntervalMs: stored.currentIntervalMs || 15 * 60 * 1000,
      maxIntervalMs: stored.maxIntervalMs || 60 * 60 * 1000, // 1 hour
      idleThresholdMs: stored.idleThresholdMs || 3 * 60 * 1000, // 3 minutes
      lastActivityAt: Date.now(),
      pingScheduledAt: null
    };
  }

  /**
   * Save session state to workspace storage
   */
  async saveState(state: SessionState): Promise<void> {
    await this.context.workspaceState.update('taskNudge.sessionState', {
      lastTaskDescription: state.lastTaskDescription,
      lastUnclear: state.lastUnclear,
      lastTried: state.lastTried,
      lastTeammate: state.lastTeammate,
      lastBlocker: state.lastBlocker,
      blockerType: state.blockerType,
      isWaiting: state.isWaiting,
      baseIntervalMs: state.baseIntervalMs,
      currentIntervalMs: state.currentIntervalMs,
      maxIntervalMs: state.maxIntervalMs,
      idleThresholdMs: state.idleThresholdMs
    });
  }

  /**
   * Update state from dialog results
   */
  updateStateFromDialog(state: SessionState, dialogResult: QuestionDialogResult): void {
    // Update answers
    if (dialogResult.taskDescription !== undefined) {
      state.lastTaskDescription = dialogResult.taskDescription;
    }
    if (dialogResult.unclear !== undefined) {
      state.lastUnclear = dialogResult.unclear;
    }
    if (dialogResult.tried !== undefined) {
      state.lastTried = dialogResult.tried;
    }
    if (dialogResult.teammate !== undefined) {
      state.lastTeammate = dialogResult.teammate;
    }
    if (dialogResult.blocker !== undefined) {
      state.lastBlocker = dialogResult.blocker;
    }

    // Update blocker type and interval logic
    const wasWaiting = state.isWaiting;
    state.blockerType = dialogResult.blockerType;

    if (dialogResult.blockerType === 'waiting_for_person' || dialogResult.blockerType === 'waiting_for_process') {
      if (!wasWaiting) {
        // First time entering waiting state - increase interval
        state.currentIntervalMs = Math.min(
          state.currentIntervalMs + state.baseIntervalMs,
          state.maxIntervalMs
        );
        state.isWaiting = true;
      }
      // If already waiting, keep the current interval
    } else {
      // Not waiting anymore - reset to base interval
      state.currentIntervalMs = state.baseIntervalMs;
      state.isWaiting = false;
    }
  }

  /**
   * Update intervals from configuration
   */
  updateIntervalsFromConfig(state: SessionState, baseMinutes: number, maxMinutes: number, idleSeconds: number): void {
    const newBaseMs = baseMinutes * 60 * 1000;
    const newMaxMs = maxMinutes * 60 * 1000;
    const newIdleMs = idleSeconds * 1000;

    // If base interval changed, update current interval proportionally if not waiting
    if (!state.isWaiting && state.baseIntervalMs !== newBaseMs) {
      state.currentIntervalMs = newBaseMs;
    }

    state.baseIntervalMs = newBaseMs;
    state.maxIntervalMs = newMaxMs;
    state.idleThresholdMs = newIdleMs;

    // Ensure current interval doesn't exceed max
    state.currentIntervalMs = Math.min(state.currentIntervalMs, state.maxIntervalMs);
  }
}