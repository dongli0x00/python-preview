import { Command } from "../common/commandManager";
import { PythonPreviewManager } from "../features/previewManager";

export class ToggleLockCommand implements Command {
    public readonly id = 'pythonPreview.toggleLock';

    public constructor(private readonly _previewManager: PythonPreviewManager) {

    }

    public execute() {
        this._previewManager.toggleLock();
    }
}