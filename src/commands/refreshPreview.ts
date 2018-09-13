import { Command } from "../common/commandManager";
import { PythonPreviewManager } from "../features/previewManager";

export class RefreshPreviewCommand implements Command {
    public readonly id = 'pythonPreview.refresh';

    public constructor(private readonly _previewManager: PythonPreviewManager) { }

    public execute() {
        this._previewManager.refresh();
    }
}