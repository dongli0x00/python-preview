'use strict';

import * as vscode from "vscode";
import {BaseDebugClient} from "./baseDebugClient";
import {IDebugServer, IPythonProcess, LaunchRequestArguments} from "../common/contracts";
import {ChildProcess, spawn} from "child_process";
import {BaseDebugServer} from "../debugServers/baseDebugServer";
import {IDebugLauncherScriptProvider} from "./launcherProvider";
import {LocalDebugServer} from "../debugServers/localDebugServer";
import { isNotInstalledError } from "../../common/helpers";
import { Logger } from "../../common/logger";
import { PythonPreviewManager } from "../../features/previewManager";

enum DebugServerStatus {
    Unknown = 1,
    Running = 2,
    NotRunning = 3
}

export class LocalDebugClient extends BaseDebugClient<LaunchRequestArguments> {
    protected _pyProc: ChildProcess | undefined;
    protected _pythonProcess!: IPythonProcess;
    protected _debugServer: BaseDebugServer | undefined;

    constructor(args: LaunchRequestArguments, private _launcherScriptProvider: IDebugLauncherScriptProvider, private _previewManager: PythonPreviewManager, private _logger: Logger) {
        super(args);
    }

    private get debugServerStatus(): DebugServerStatus {
        if (this._debugServer) {
            switch (this._debugServer!.isRunning) {
                case true:
                    return DebugServerStatus.Running;
                case false:
                    return DebugServerStatus.NotRunning;
            }
        }
        return DebugServerStatus.Unknown;
    }

    public createDebugServer(pythonProcess?: IPythonProcess): BaseDebugServer {
        this._pythonProcess = pythonProcess!;
        this._debugServer = new LocalDebugServer(this._pythonProcess!, this._args, this._logger);
        return this._debugServer;
    }

    public stop() {
        if (this._debugServer) {
            this._debugServer!.stop();
            this._debugServer = undefined;
        }
        if (this._pyProc) {
            this._pyProc.kill();
            this._pyProc = undefined;
        }
    }

    private displayError(error: any) {
        let errorMsg = typeof error === 'string' ? error : ((error.message && error.message.length > 0) ? error.message : '');
        if (isNotInstalledError(error)) {
            errorMsg = `Failed to launch the Python Process, please validate the path '${this._args.pythonPath}'`;
        }
        if (errorMsg.length > 0) {
            vscode.window.showErrorMessage(errorMsg);
            this._logger.error(errorMsg);
        }
    }

    public async launchApplicationToDebug(debugServer: IDebugServer): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let pythonPath = 'python';
            if (typeof this._args.pythonPath === 'string' && this._args.pythonPath.trim().length > 0) {
                pythonPath = this._args.pythonPath;
            }
            const args = this.buildLaunchArguments(debugServer.port);
            this._logger.info('Starting Debug Client');
            this._pyProc = spawn(pythonPath, args);
            this.handleProcessOutput(this._pyProc!, reject);

            // Here we wait for the application to connect to the socket server.
            // Only once connected do we know that the application has successfully launched.
            this._debugServer!.debugClientConnected
                .then(resolve)
                .catch(ex => console.error('Python Client Connect Exception: _debugServer.debugClientConnected', ex));
        })
    }

    protected handleProcessOutput(proc: ChildProcess, failedToLaunch: (error: Error | string | Buffer) => void) {
        proc.on('error', error => {
            const status = this.debugServerStatus;
            if (status === DebugServerStatus.Running) {
                return;
            }
            if (status === DebugServerStatus.NotRunning && typeof(error) === 'object' && error !== null) {
                return failedToLaunch(error);
            }
            // This could happen when the debugger didn't launch at all, e.g. python doesn't exist.
            this.displayError(error);
            this._previewManager.dispose();
        });

        proc.stderr.setEncoding('utf8');
        proc.stderr.on('data', error => {
            // if (this.debugServerStatus === DebugServerStatus.NotRunning) {
            //     return failedToLaunch(error);
            // }
            let x = 0;
        });

        proc.stdout.setEncoding('utf-8');
        proc.stdout.on('data', d => {
            const arr = d.toString().split('&');
            const length = arr.length;
            if (length <= 2) return;
            const dataType = arr[length - 2];
            const dataMessage = arr[length - 1];
            if (dataType === 'info') {
                this._logger.info(dataMessage);
            } else if (dataType === 'warn') {
                this._logger.warn(dataMessage);
            } else if (dataType === 'error') {
                this.displayError(dataMessage);
                this._previewManager.dispose();
            }
        });
    }

    private buildLaunchArguments(debugPort: number): string[] {
        return [...this.buildDebugArguments(debugPort)];
    }

    private buildDebugArguments(debugPort: number): string[] {
        const launcherFilePath = this._launcherScriptProvider.getLauncherFilePath();
        return [launcherFilePath, debugPort.toString(), 'ba648ec3-d025-44bb-92fb-7ded4267a243'];
    }
}