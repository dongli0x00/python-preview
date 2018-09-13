import * as vscode from 'vscode';
import {Command} from "../common/commandManager";
import {PythonPreviewManager} from "../features/previewManager";

export class ShowSourceCommand implements Command {
    public readonly id = 'pythonPreview.showSource';

    public constructor(private readonly _previewManager: PythonPreviewManager) {

    }

    public execute() {
        if (this._previewManager.activePreviewResource) {
            return vscode.workspace.openTextDocument(this._previewManager.activePreviewResource)
                                   .then(document => vscode.window.showTextDocument(document));
        }
        return undefined;
    }
}