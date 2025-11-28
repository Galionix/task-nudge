# Change Log

All notable changes to the "task-nudge" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.1] - 2025-11-28

### Enhanced
- 🧠 **Improved AI Opening Messages**: AI now provides specific progress commentary based on Git analysis
- 📝 **Progress-Aware Voice Messages**: Opening voice messages now include detailed progress analysis
- 🔍 **Enhanced Git Analysis Integration**: AI comments directly on whether developer is stuck, making progress, or actively working

### Technical Improvements
- Added `buildOpeningPromptWithGitAnalysis` method for specialized progress-aware prompts
- Enhanced opening message generation to include file count and change context
- Improved AI prompt engineering for more accurate progress assessment
- Better integration of Git diff data with AI message generation

## [1.0.0] - 2025-11-27

### Added
- ✨ AI-powered developer productivity assistant
- 🤖 OpenAI GPT integration for personalized messages
- 🗣️ Voice synthesis using OpenAI TTS API
- 📊 Git progress tracking and analysis
- 💬 Interactive AI chat assistant in sidebar
- 🔄 Periodic check-ins with adaptive intervals
- 📈 Expandable Git diff analysis with detailed statistics
- 🎯 Activity tracking (text changes, cursor movements, file switches)
- ⚙️ Configurable questions and settings
- 🌍 Multi-language support (Russian and English)
- 📱 Responsive chat interface with typing indicators
- 🔍 Detailed progress detection between check-ins
- 🎵 Optional voice narration of all messages
- 📋 Survey results display in chat
- 🤝 "Don't know" option with AI assistance

### Features in Detail

#### Smart Nudging System
- Monitors developer activity in real-time
- Adapts ping frequency based on progress detection
- Configurable idle thresholds and intervals
- Manual trigger via command palette

#### AI Integration
- Context-aware message generation based on Git analysis
- Encouraging responses to survey answers
- Real-time chat assistance for ongoing questions
- Fallback messages when OpenAI API is unavailable

#### Git Analysis
- Compares file changes between pings
- Detects when developer is stuck (no progress)
- Shows staged and unstaged changes with statistics
- File-level diff analysis with additions/deletions count

#### Voice Features
- Text-to-speech for all AI messages
- Configurable language support
- Uses OpenAI's high-quality TTS models
- Optional voice feedback for accessibility

#### Chat Interface
- Dedicated sidebar panel in VS Code activity bar
- Persistent chat history during session
- Expandable Git analysis sections
- Clean UI with dark theme support
- Typing indicators and message timestamps

### Technical
- Built with TypeScript and webpack
- VS Code Extension API integration
- OpenAI API integration (GPT-3.5-turbo, TTS-1)
- Git CLI integration for change tracking
- Local state management for session persistence

### Configuration
- `taskNudge.enabled`: Enable/disable extension
- `taskNudge.baseIntervalMinutes`: Base ping interval (default: 15)
- `taskNudge.maxIntervalMinutes`: Maximum ping interval (default: 60)
- `taskNudge.idleThresholdSeconds`: Idle detection threshold (default: 180)
- `taskNudge.openaiApiKey`: OpenAI API key for AI features
- `taskNudge.voiceEnabled`: Enable voice synthesis (default: true)
- `taskNudge.voiceLanguage`: Voice language selection (default: ru)
- `taskNudge.questions`: Customizable survey questions

### Requirements
- VS Code 1.105.0 or higher
- OpenAI API key (for full functionality)
- Git repository (for Git analysis features)](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release