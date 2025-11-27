/**
 * Type definitions for Task Nudge extension
 */

export type BlockerType =
  | 'none'
  | 'waiting_for_person'
  | 'waiting_for_process'
  | 'other';

export interface SessionState {
  lastTaskDescription?: string;
  lastUnclear?: string;
  lastTried?: string;
  lastTeammate?: string;
  lastBlocker?: string;
  blockerType: BlockerType;
  isWaiting: boolean;
  baseIntervalMs: number;
  currentIntervalMs: number;
  maxIntervalMs: number;
  idleThresholdMs: number;
  lastActivityAt: number;
  pingScheduledAt?: number | null;
}

export interface ExtensionConfig {
  enabled: boolean;
  baseIntervalMinutes: number;
  maxIntervalMinutes: number;
  idleThresholdSeconds: number;
  questionsEnabled: {
    task: boolean;
    unclear: boolean;
    tried: boolean;
    teammate: boolean;
    blocker: boolean;
  };
}

export interface QuestionDialogResult {
  taskDescription?: string;
  unclear?: string;
  tried?: string;
  teammate?: string;
  blocker?: string;
  blockerType: BlockerType;
}