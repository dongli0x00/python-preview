import * as vscode from 'vscode';
import { Logger } from './common/logger';
import { PythonContentProvider } from './features/previewContentProvider';
import { PythonPreviewManager } from './features/previewManager';
import { CommandManager } from './common/commandManager';
import * as commands from './commands';

export function activate(context: vscode.ExtensionContext) {
    const logger = new Logger();

    const contentProvider = new PythonContentProvider(context, logger);
    const previewManager = new PythonPreviewManager(context, contentProvider, logger);
    context.subscriptions.push(previewManager);

    const commandManager = new CommandManager();
    context.subscriptions.push(commandManager);
    commandManager.register(new commands.ShowPreviewCommand(previewManager));
    commandManager.register(new commands.ShowPreviewToSideCommand(previewManager));
    commandManager.register(new commands.ShowLockedPreviewToSideCommand(previewManager));
    commandManager.register(new commands.ShowSourceCommand(previewManager));
    commandManager.register(new commands.RefreshPreviewCommand(previewManager));
    commandManager.register(new commands.ToggleLockCommand(previewManager));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        logger.updateConfiguration();
        previewManager.updateConfiguration();
    }))
}