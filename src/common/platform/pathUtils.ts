import * as path from "path";

export const IPathUtils = Symbol('IPathUtils');

export interface IPathUtils {
    getPathVariableName(): 'Path' | 'PATH';
    basename(pathValue: string, ext?: string): string;
}

export class PathUtils implements IPathUtils {
    constructor(private _isWindows: boolean) { }

    public getPathVariableName() {
        return this._isWindows ? 'Path' : 'PATH';
    }

    public basename(pathValue: string, ext?: string): string {
        return path.basename(pathValue, ext);
    }
}