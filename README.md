# Task Nudge

An AI-powered developer productivity assistant that helps you stay on track with periodic check-ins, voice feedback, and Git analysis.

## Features

### 🔔 Smart Nudges
- Periodic check-ins during periods of inactivity
- Adaptive intervals based on your progress
- Configurable timing and questions

### 🤖 AI Integration
- OpenAI GPT-powered personalized messages
- Context-aware responses based on your Git activity
- Encouraging feedback and helpful suggestions

### 🗣️ Voice Synthesis
- Text-to-speech using OpenAI's TTS API
- Supports multiple languages (Russian and English)
- Optional voice narration of all messages

### 📊 Git Analysis
- Tracks changes between check-ins
- Detects when you're stuck (no progress)
- Detailed diff analysis with file-level statistics
- Expandable Git analysis in chat interface

### 💬 AI Chat Assistant
- Sidebar chat panel for ongoing assistance
- Ask questions about your tasks
- Get help when answering "don't know" to surveys
- Persistent chat history during VS Code session

## Setup

1. Install the extension
2. Configure your OpenAI API key in VS Code settings
3. Customize nudge intervals and questions to your preference

### Required Settings

- **OpenAI API Key**: Get one from [OpenAI Platform](https://platform.openai.com/api-keys)

### Optional Settings

- **Base Interval**: Time between nudges (default: 15 minutes)
- **Max Interval**: Maximum time between nudges (default: 60 minutes)
- **Idle Threshold**: Seconds of inactivity before considering you idle (default: 180)
- **Voice Enabled**: Enable text-to-speech (default: true)
- **Voice Language**: Language for voice synthesis (default: ru)
- **Questions**: Customize the questions asked during check-ins

## Usage

1. **Automatic Nudges**: The extension automatically tracks your activity and sends nudges when you're inactive
2. **Manual Check**: Use `Ctrl+Shift+P` → "Task Nudge: Check Now" for immediate survey
3. **Chat Interface**: Click the Task Nudge icon in the activity bar to open the AI chat
4. **Git Analysis**: View detailed Git changes in expandable sections within the chat

## How It Works

### Activity Tracking
- Monitors text changes, cursor movements, and file switches
- Calculates idle time based on your activity patterns
- Adapts nudge frequency based on detected progress

### Progress Detection
- Compares Git state between check-ins
- Identifies when you're stuck (same files, no new changes)
- Provides contextual messages based on your current work

### AI Integration
- Generates personalized opening messages based on Git analysis
- Analyzes your survey responses for encouraging feedback
- Provides ongoing chat support for questions and guidance

## Extension Settings

This extension contributes the following settings:

- `taskNudge.enabled`: Enable developer pings during periods of inactivity
- `taskNudge.baseIntervalMinutes`: Base interval between pings (in minutes)
- `taskNudge.maxIntervalMinutes`: Maximum interval between pings (in minutes)
- `taskNudge.idleThresholdSeconds`: How many seconds without activity to consider idle
- `taskNudge.openaiApiKey`: OpenAI API key for generating personalized messages
- `taskNudge.voiceEnabled`: Enable voice narration of messages
- `taskNudge.voiceLanguage`: Language for voice narration (ru/en)
- `taskNudge.questions`: Customize the questions asked during check-ins

## Requirements

- VS Code 1.105.0 or higher
- OpenAI API key (for full functionality)
- Git repository (for Git analysis features)

## Privacy

- Your code and responses are sent to OpenAI for AI features
- Git analysis happens locally, only metadata is processed
- No data is stored outside your local VS Code workspace
- API communications are encrypted via HTTPS

## Known Issues

- Voice synthesis requires internet connection
- Git analysis requires a valid Git repository
- Some features may not work in remote workspaces

## Release Notes

### 1.0.0

Initial release of Task Nudge with full feature set:
- AI-powered nudges with OpenAI integration
- Voice synthesis support
- Git progress tracking and analysis
- Interactive chat interface
- Expandable Git diff analysis
- English interface

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

MIT License

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

1. Откройте проект в VS Code
2. Нажмите `F5` или запустите задачу "Run Extension"
3. Откроется новое окно VS Code с расширением

### Сборка

```bash
npm run compile
```

### Тестирование

```bash
npm run test
```

### Упаковка

```bash
npm run package
```

## Структура проекта

```
src/
├── extension.ts     # Основная логика расширения
├── config.ts        # Управление настройками
├── dialog.ts        # Диалоги пользователя
├── git.ts          # Интеграция с Git
├── state.ts        # Управление состоянием
├── types.ts        # TypeScript интерфейсы
└── test/           # Тесты
```

## Лицензия

MIT
