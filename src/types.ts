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
  lastGitSnapshot?: string; // JSON строка с предыдущим Git diff
  lastQuestionAnswers?: string[]; // Ответы на последние вопросы
}

export interface ExtensionConfig {
  enabled: boolean;
  baseIntervalMinutes: number;
  maxIntervalMinutes: number;
  idleThresholdSeconds: number;
  questions: string[]; // Список настраиваемых вопросов
  openaiApiKey: string;
  voiceEnabled: boolean;
  voiceLanguage: 'ru' | 'en';
}

export interface QuestionDialogResult {
  answers: string[]; // Ответы на вопросы
  blockerType: BlockerType;
}

export interface GitSnapshot {
  timestamp: number;
  changedFiles: string[];
  additions: number;
  deletions: number;
  summary: string; // Краткое описание изменений
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface VoiceOptions {
  text: string;
  language: 'ru' | 'en';
  rate?: number;
  pitch?: number;
  volume?: number;
}