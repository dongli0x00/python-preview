'use strict';

import * as path from "path";

export interface IDebugLauncherScriptProvider {
    getLauncherFilePath(): string;
}

export class DebuggerLauncherScriptProvider implements IDebugLauncherScriptProvider {
    public getLauncherFilePath(): string {
        return path.join(path.dirname(__dirname), '..', '..', 'pythonFiles', 'pydev', 'launcher.py');
    }
}