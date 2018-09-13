import * as vscode from 'vscode';
import { lazy } from './lazy';
import * as is from './is';

enum Trace {
    Off,
    Verbose
}

namespace Trace {
    export function fromString(value: string): Trace {
        value = value.toLowerCase();
        switch (value) {
            case 'off':
                return Trace.Off;
            case 'verbose':
                return Trace.Verbose;
            default:
                return Trace.Off;
        }
    }
}

export class Logger {
    private _trace?: Trace;
    
    private readonly _outputChannel = lazy(() => vscode.window.createOutputChannel('PythonPreview'));

    constructor() {
        this.updateConfiguration();
    }

    public updateConfiguration() {
        this._trace = this.readTrace();
    }

    public info(message: string, data?: any): void {
        this.logLevel('Info', message, data);
    }

    public warn(message: string, data?: any): void {
        this.logLevel('Warn', message, data);
    }

    public error(message: string, data?: any): void {
        this.logLevel('Error', message, data);
    }

    public logLevel(level: string, message: string, data?: any): void {
        if (this._trace === Trace.Verbose) {
            this.appendLine(`[${level} - ${(new Date().toLocaleTimeString())}] ${message}`);
            if (data) {
                this.appendLine(Logger.data2String(data));
            }
        }

    }

    private appendLine(value: string) {
        this._outputChannel.value.appendLine(value);
    }

    private static data2String(data: any): string {
        if (data instanceof Error) {
            if (is.string(data.stack)) {
                return data.stack;
            }
            return (data as Error).message;
        }
        if (is.boolean(data.success) && !data.success && is.string(data.message)) {
            return data.message;
        }
        if (is.string(data)) {
            return data;
        }
        return data.toString(); 
    }

    private readTrace(): Trace {
        return Trace.fromString(vscode.workspace.getConfiguration().get<string>('pythonPreview.trace', 'off'));
    }
}