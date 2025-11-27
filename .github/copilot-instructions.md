<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Task Nudge VS Code Extension

This project is a TypeScript-based VS Code extension that helps developers stay on track by sending periodic nudges during periods of inactivity.

## Project Structure

- `src/` - TypeScript source files
- `package.json` - Extension manifest and dependencies
- `tsconfig.json` - TypeScript configuration
- `webpack.config.js` - Build configuration
- `.vscodeignore` - Files to exclude from extension package

## Key Features

- Activity tracking (text changes, selection changes, file switches)
- Git diff integration for context
- Adaptive ping intervals based on blocker types
- Configurable questions and settings
- Session state management

## Development Guidelines

- Use VS Code extension APIs for activity tracking
- Follow TypeScript best practices
- Implement proper error handling and logging
- Keep configuration options user-friendly
- Test with different workspace scenarios

## API Usage

- Use `vscode.workspace.onDidChangeTextDocument` for text activity
- Use `vscode.window.onDidChangeTextEditorSelection` for selection activity
- Use `vscode.extensions.getExtension('vscode.git')` for Git integration
- Use `vscode.workspace.getConfiguration()` for settings

## Coding Standards

- Use descriptive variable and function names
- Add JSDoc comments for public methods
- Handle async operations properly
- Dispose of event listeners in `deactivate()`