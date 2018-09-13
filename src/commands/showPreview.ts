import * as vscode from 'vscode';
import {Command} from "../common/commandManager";
import {PythonPreviewManager} from "../features/previewManager";

interface ShowPreviewSettings {
    readonly sideBySide: boolean;
    readonly locked: boolean;
}

async function showPreview(previewManager: PythonPreviewManager,
                           uri: vscode.Uri | undefined,
                           previewSettings: ShowPreviewSettings): Promise<any> {
    let resource = uri;
    if (!(resource instanceof vscode.Uri)) {
        if (vscode.window.activeTextEditor) {
            resource = vscode.window.activeTextEditor.document.uri;
        } else {
            return vscode.commands.executeCommand('pythonPreview.showSource');
        }
    }
    
    previewManager.preview(resource, {
        resourceColumn: (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) || vscode.ViewColumn.One,
        previewColumn: previewSettings.sideBySide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
        locked: previewSettings.locked
    });
}

/**
 * 
 */
export class ShowPreviewCommand implements Command {
    public readonly id = 'pythonPreview.showPreview';

    public constructor(private readonly _prviewManager: PythonPreviewManager) { }

    public execute() {
        showPreview(this._prviewManager, undefined, {
            sideBySide: false,
            locked: false 
        });
    }
}


export class ShowPreviewToSideCommand implements Command {
    public readonly id = 'pythonPreview.showPreviewToSide';

    public constructor(private readonly _previewManager: PythonPreviewManager) { }

    public execute() {
        showPreview(this._previewManager, undefined, {
            sideBySide: true,
            locked: false
        });
    }
}

export class ShowLockedPreviewToSideCommand implements Command {
    public readonly id = 'pythonPreview.showLockedPreviewToSide';

    public constructor(private readonly _previewManager: PythonPreviewManager) { }

    public execute() {
        showPreview(this._previewManager, undefined, {
            sideBySide: true,
            locked: true
        });
    }
}