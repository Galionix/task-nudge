import * as vscode from 'vscode';
import { VoiceOptions } from './types';

/**
 * Voice synthesis manager using OpenAI TTS API
 */
export class VoiceManager {
  private apiKey: string = '';

  constructor() {
    // API key будет установлен через updateApiKey
  }

  /**
   * Update OpenAI API key
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check if voice synthesis is supported (имеется API ключ)
   */
  isVoiceSupported(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Speak text using OpenAI TTS
   */
  async speak(options: VoiceOptions): Promise<void> {
    if (!this.isVoiceSupported()) {
      console.log(`[VOICE - No API Key]: ${options.text}`);
      await this.fallbackToText(options.text);
      return;
    }

    console.log(`[VOICE] Generating speech for: "${options.text}"`);

    try {
      const audioBuffer = await this.generateSpeechWithOpenAI(options.text, options.language);
      console.log(`[VOICE] Speech generated successfully, ${audioBuffer.byteLength} bytes`);
      await this.playAudio(audioBuffer);
    } catch (error) {
      console.error('OpenAI TTS failed:', error);
      await this.fallbackToText(options.text);
    }
  }

  /**
   * Generate speech using OpenAI TTS API
   */
  private async generateSpeechWithOpenAI(text: string, language: 'ru' | 'en'): Promise<ArrayBuffer> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: language === 'ru' ? 'alloy' : 'alloy', // OpenAI voices work for both languages
        response_format: 'mp3',
        speed: 1.0
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * Play audio buffer (save to temp file and play)
   */
  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Create temp file
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `task-nudge-voice-${Date.now()}.mp3`);

      // Save audio to temp file
      await fs.writeFile(tempFile, Buffer.from(audioBuffer));

      console.log(`[VOICE] Audio saved to: ${tempFile}`);

      // Play audio file using system command (macOS)
      try {
        await execAsync(`afplay "${tempFile}"`);
        console.log('[VOICE] Audio played successfully');
      } catch (playError) {
        console.log('[VOICE] afplay not available, trying open command');
        try {
          await execAsync(`open "${tempFile}"`);
        } catch (openError) {
          console.log('[VOICE] Could not play audio automatically');
          vscode.window.showInformationMessage(
            `🔊 Голосовое сообщение сохранено: ${tempFile}`,
            'Открыть'
          ).then(action => {
            if (action === 'Открыть') {
              vscode.env.openExternal(vscode.Uri.file(tempFile));
            }
          });
        }
      }

      // Clean up temp file after 30 seconds
      setTimeout(async () => {
        try {
          await fs.unlink(tempFile);
          console.log('[VOICE] Temp audio file cleaned up');
        } catch (error) {
          // Ignore cleanup errors
        }
      }, 30000);

    } catch (error) {
      console.error('[VOICE] Failed to play audio:', error);
      vscode.window.showWarningMessage('🔊 Голос сгенерирован, но не удалось воспроизвести');
    }
  }

  /**
   * Speak opening message
   */
  async speakOpeningMessage(message: string, language: 'ru' | 'en' = 'ru'): Promise<void> {
    await this.speak({
      text: message,
      language,
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8
    });
  }

  /**
   * Speak encouragement message
   */
  async speakEncouragement(message: string, language: 'ru' | 'en' = 'ru'): Promise<void> {
    await this.speak({
      text: message,
      language,
      rate: 0.9,
      pitch: 1.1,
      volume: 0.8
    });
  }

  /**
   * Stop current speech
   */
  stop(): void {
    // TODO: Остановить текущее озвучивание
    console.log('Speech stopped');
  }

  /**
   * Fallback to text display when voice is not available
   */
  private async fallbackToText(text: string): Promise<void> {
    console.log(`[VOICE]: ${text}`);

    // Показываем текст в output channel для дебага
    const outputChannel = vscode.window.createOutputChannel('Task Nudge Voice');
    outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${text}`);

    // Можно показать временное уведомление
    // vscode.window.showInformationMessage(`🗣️ ${text}`, { modal: false });
  }

  /**
   * Create webview for voice synthesis (future implementation)
   */
  private async createVoiceWebview(): Promise<vscode.WebviewPanel | null> {
    try {
      const panel = vscode.window.createWebviewPanel(
        'taskNudgeVoice',
        'Task Nudge Voice',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      panel.webview.html = this.getVoiceWebviewContent();

      return panel;
    } catch (error) {
      console.error('Failed to create voice webview:', error);
      return null;
    }
  }

  /**
   * Get HTML content for voice webview
   */
  private getVoiceWebviewContent(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Nudge Voice</title>
    </head>
    <body style="display: none;">
        <script>
            const vscode = acquireVsCodeApi();

            window.addEventListener('message', event => {
                const message = event.data;

                if (message.command === 'speak') {
                    if ('speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(message.text);
                        utterance.lang = message.language === 'ru' ? 'ru-RU' : 'en-US';
                        utterance.rate = message.rate || 1.0;
                        utterance.pitch = message.pitch || 1.0;
                        utterance.volume = message.volume || 0.8;

                        utterance.onend = () => {
                            vscode.postMessage({ command: 'speechEnded' });
                        };

                        utterance.onerror = (error) => {
                            vscode.postMessage({ command: 'speechError', error: error.error });
                        };

                        speechSynthesis.speak(utterance);
                    } else {
                        vscode.postMessage({ command: 'speechError', error: 'Speech synthesis not supported' });
                    }
                } else if (message.command === 'stop') {
                    if ('speechSynthesis' in window) {
                        speechSynthesis.cancel();
                    }
                }
            });

            // Уведомить об готовности
            vscode.postMessage({ command: 'ready' });
        </script>
    </body>
    </html>`;
  }
}