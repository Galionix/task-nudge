import * as vscode from 'vscode';
import { OpenAIManager } from './openai';

/**
 * Chat view provider for sidebar panel
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'task-nudge-chat-view';
  private view?: vscode.WebviewView;
  private openaiManager: OpenAIManager;
  private chatHistory: Array<{ role: 'user' | 'assistant', content: string, timestamp: Date }> = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private context: vscode.ExtensionContext
  ) {
    this.openaiManager = new OpenAIManager('');
  }

  public updateOpenAIKey(apiKey: string): void {
    this.openaiManager = new OpenAIManager(apiKey);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'sendMessage':
          await this.handleUserMessage(data.text);
          break;
        case 'clearChat':
          await this.clearChat();
          break;
      }
    });
  }

  /**
   * Add debug message to chat
   */
  public async addDebugMessage(message: string): Promise<void> {
    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage({
      command: 'addDebugMessage',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  /**
   * Add system message to chat
   */
  public async addSystemMessage(message: string): Promise<void> {
    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage({
      command: 'addSystemMessage',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  /**
   * Add AI assistant message to chat
   */
  public async addAssistantMessage(message: string): Promise<void> {
    if (!this.view) {
      return;
    }

    this.chatHistory.push({ role: 'assistant', content: message, timestamp: new Date() });

    await this.view.webview.postMessage({
      command: 'addAssistantMessage',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  /**
   * Add collapsible Git analysis message
   */
  public async addCollapsibleMessage(title: string, content: string): Promise<void> {
    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage({
      command: 'addCollapsibleMessage',
      title: title,
      content: content,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  /**
   * Handle user message from chat
   */
  private async handleUserMessage(userMessage: string): Promise<void> {
    if (!userMessage.trim() || !this.view) {
      return;
    }

    // Add user message to history and UI
    this.chatHistory.push({ role: 'user', content: userMessage, timestamp: new Date() });

    await this.view.webview.postMessage({
      command: 'addUserMessage',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString()
    });

    // Generate AI response
    try {
      await this.view.webview.postMessage({ command: 'showTyping' });

      const aiResponse = await this.generateChatResponse(userMessage);

      await this.view.webview.postMessage({ command: 'hideTyping' });
      await this.addAssistantMessage(aiResponse);
    } catch (error) {
      await this.view.webview.postMessage({ command: 'hideTyping' });
      await this.addAssistantMessage('Sorry, I\'m having connection issues with AI. Please check your API key in settings.');
      console.error('Chat AI response failed:', error);
    }
  }

  /**
   * Generate AI response for chat
   */
  private async generateChatResponse(userMessage: string): Promise<string> {
    // Build context from recent chat history
    const recentHistory = this.chatHistory.slice(-6);

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a friendly developer assistant in the Task Nudge extension. You help with tasks, give advice, and provide support. Answer concisely and to the point in English.'
      },
      ...recentHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user' as const, content: userMessage }
    ];

    const response = await this.openaiManager.generateChatResponse(messages);
    return response || 'Could not generate response. Please try rephrasing your question.';
  }

  /**
   * Clear chat history
   */
  private async clearChat(): Promise<void> {
    this.chatHistory = [];
    if (this.view) {
      await this.view.webview.postMessage({ command: 'clearMessages' });
    }
  }

  private getHtmlForWebview(webview: vscode.Webview) {
    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Nudge Chat</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                margin: 0;
                padding: 8px;
                background: var(--vscode-sidebar-background);
                color: var(--vscode-sidebar-foreground);
                display: flex;
                flex-direction: column;
                height: 100vh;
                box-sizing: border-box;
            }

            .chat-container {
                flex: 1;
                overflow-y: auto;
                padding: 4px 0;
                margin-bottom: 8px;
            }

            .message {
                margin: 6px 0;
                padding: 8px;
                border-radius: 6px;
                word-wrap: break-word;
                font-size: 13px;
                line-height: 1.4;
            }

            .user-message {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                margin-left: 10px;
                border: 1px solid var(--vscode-button-border);
            }

            .assistant-message {
                background: var(--vscode-editor-selectionBackground);
                color: var(--vscode-editor-foreground);
                border-left: 3px solid var(--vscode-focusBorder);
                margin-right: 10px;
                border: 1px solid var(--vscode-panel-border);
            }

            .system-message {
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                font-style: italic;
                text-align: center;
                font-size: 12px;
                border: 1px solid var(--vscode-badge-background);
            }

            .debug-message {
                background: var(--vscode-terminal-selectionBackground);
                color: var(--vscode-terminal-foreground);
                font-family: var(--vscode-editor-font-family);
                font-size: 11px;
                border-left: 3px solid var(--vscode-terminal-ansiBrightBlue);
                border: 1px solid var(--vscode-panel-border);
            }

            .collapsible-message {
                background: var(--vscode-editor-selectionBackground);
                color: var(--vscode-editor-foreground);
                border: 1px solid var(--vscode-panel-border);
                border-left: 3px solid var(--vscode-focusBorder);
                margin-right: 10px;
            }

            .collapsible-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                padding: 2px 0;
                user-select: none;
            }

            .collapsible-title {
                font-weight: bold;
                font-size: 12px;
            }

            .collapsible-toggle {
                font-size: 10px;
                color: var(--vscode-descriptionForeground);
                transform: rotate(0deg);
                transition: transform 0.2s;
            }

            .collapsible-toggle.expanded {
                transform: rotate(180deg);
            }

            .collapsible-content {
                display: none;
                margin-top: 6px;
                padding-top: 6px;
                border-top: 1px solid var(--vscode-widget-border);
                font-family: var(--vscode-editor-font-family);
                font-size: 11px;
                white-space: pre-line;
                color: var(--vscode-terminal-foreground);
            }

            .collapsible-content.expanded {
                display: block;
            }

            .timestamp {
                font-size: 10px;
                opacity: 0.6;
                margin-top: 4px;
            }

            .input-container {
                border-top: 1px solid var(--vscode-widget-border);
                padding-top: 8px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .message-input {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 3px;
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                font-family: inherit;
                font-size: 13px;
                box-sizing: border-box;
                resize: none;
                min-height: 60px;
                max-height: 120px;
            }

            .button-row {
                display: flex;
                gap: 6px;
            }

            .send-button, .clear-button {
                padding: 6px 12px;
                border: none;
                border-radius: 3px;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                cursor: pointer;
                font-family: inherit;
                font-size: 12px;
                flex: 1;
            }

            .clear-button {
                background: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }

            .send-button:hover, .clear-button:hover {
                opacity: 0.8;
            }

            .typing-indicator {
                display: none;
                padding: 6px 8px;
                background: var(--vscode-editor-selectionBackground);
                color: var(--vscode-editor-foreground);
                border-left: 3px solid var(--vscode-focusBorder);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                margin: 6px 10px 6px 0;
                font-style: italic;
                font-size: 12px;
            }

            .typing-indicator.visible {
                display: block;
            }

            .intro-message {
                text-align: center;
                padding: 16px 8px;
                color: var(--vscode-foreground);
                background: var(--vscode-editor-selectionBackground);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                margin: 8px 4px;
                font-size: 12px;
                line-height: 1.5;
            }

            .intro-message .icon {
                font-size: 24px;
                margin-bottom: 8px;
            }
        </style>
    </head>
    <body>
        <div class="chat-container" id="chatContainer">
            <div class="intro-message">
                <div class="icon">🤖</div>
                <div>Hello! I'm your AI assistant.</div>
                <div>Ask questions about tasks and get advice!</div>
                <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
                    Chat activates after the first Task Nudge survey
                </div>
            </div>
        </div>

        <div class="typing-indicator" id="typingIndicator">
            AI is typing...
        </div>

        <div class="input-container">
            <textarea class="message-input" id="messageInput" placeholder="Type a message..."></textarea>
            <div class="button-row">
                <button class="send-button" id="sendButton">Send</button>
                <button class="clear-button" id="clearButton">Clear</button>
            </div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const chatContainer = document.getElementById('chatContainer');
            const messageInput = document.getElementById('messageInput');
            const sendButton = document.getElementById('sendButton');
            const clearButton = document.getElementById('clearButton');
            const typingIndicator = document.getElementById('typingIndicator');

            // Send message function
            function sendMessage() {
                const text = messageInput.value.trim();
                if (!text) return;

                vscode.postMessage({
                    command: 'sendMessage',
                    text: text
                });

                messageInput.value = '';
                messageInput.style.height = '60px';
            }

            // Auto-resize textarea
            messageInput.addEventListener('input', function() {
                this.style.height = '60px';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });

            // Event listeners
            sendButton.addEventListener('click', sendMessage);
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            clearButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'clearChat' });
            });

            // Handle messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.command) {
                    case 'addUserMessage':
                        addMessage(message.content, 'user', message.timestamp);
                        break;
                    case 'addAssistantMessage':
                        addMessage(message.content, 'assistant', message.timestamp);
                        break;
                    case 'addSystemMessage':
                        addMessage(message.content, 'system', message.timestamp);
                        break;
                    case 'addDebugMessage':
                        addMessage(message.content, 'debug', message.timestamp);
                        break;
                    case 'addCollapsibleMessage':
                        addCollapsibleMessage(message.title, message.content, message.timestamp);
                        break;
                    case 'clearMessages':
                        clearMessages();
                        break;
                    case 'showTyping':
                        typingIndicator.classList.add('visible');
                        scrollToBottom();
                        break;
                    case 'hideTyping':
                        typingIndicator.classList.remove('visible');
                        break;
                }
            });

            function addMessage(content, type, timestamp) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${type}-message\`;

                const contentDiv = document.createElement('div');
                contentDiv.textContent = content;
                messageDiv.appendChild(contentDiv);

                if (timestamp) {
                    const timestampDiv = document.createElement('div');
                    timestampDiv.className = 'timestamp';
                    timestampDiv.textContent = timestamp;
                    messageDiv.appendChild(timestampDiv);
                }

                chatContainer.appendChild(messageDiv);
                scrollToBottom();
            }

            function addCollapsibleMessage(title, content, timestamp) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message collapsible-message';

                // Header with title and toggle
                const headerDiv = document.createElement('div');
                headerDiv.className = 'collapsible-header';

                const titleDiv = document.createElement('div');
                titleDiv.className = 'collapsible-title';
                titleDiv.textContent = title;

                const toggleDiv = document.createElement('div');
                toggleDiv.className = 'collapsible-toggle';
                toggleDiv.textContent = '▼';

                headerDiv.appendChild(titleDiv);
                headerDiv.appendChild(toggleDiv);

                // Content (initially hidden)
                const contentDiv = document.createElement('div');
                contentDiv.className = 'collapsible-content';
                contentDiv.textContent = content;

                // Timestamp
                let timestampDiv;
                if (timestamp) {
                    timestampDiv = document.createElement('div');
                    timestampDiv.className = 'timestamp';
                    timestampDiv.textContent = timestamp;
                }

                // Click handler for toggle
                headerDiv.addEventListener('click', () => {
                    const isExpanded = contentDiv.classList.contains('expanded');
                    if (isExpanded) {
                        contentDiv.classList.remove('expanded');
                        toggleDiv.classList.remove('expanded');
                        toggleDiv.textContent = '▼';
                    } else {
                        contentDiv.classList.add('expanded');
                        toggleDiv.classList.add('expanded');
                        toggleDiv.textContent = '▲';
                    }
                });

                messageDiv.appendChild(headerDiv);
                messageDiv.appendChild(contentDiv);
                if (timestampDiv) {
                    messageDiv.appendChild(timestampDiv);
                }

                chatContainer.appendChild(messageDiv);
                scrollToBottom();
            }

            function clearMessages() {
                chatContainer.innerHTML = '<div class="intro-message"><div class="icon">🤖</div><div>Chat cleared. Ready for a new conversation!</div></div>';
            }

            function scrollToBottom() {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            // Focus input on load
            messageInput.focus();
        </script>
    </body>
    </html>`;
  }
}