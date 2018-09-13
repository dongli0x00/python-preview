import * as vscode from "vscode";
import * as path from 'path';
import {PythonPreviewConfigurationManager} from "./previewConfig";
import {PythonPreview} from "./preview";
import {PythonContentProvider} from "./previewContentProvider";
import {Logger} from "../common/logger";
import {disposeAll} from "../common/dispose";
import { IDebugServer, LaunchRequestArguments } from "../debugger/common/contracts";
import { PythonProcess } from "../debugger/pythonProcess";
import { BaseDebugClient } from "../debugger/debugClients/baseDebugClient";
import { BaseDebugServer } from "../debugger/debugServers/baseDebugServer";
import { getPythonExecutable } from "../debugger/common/utils";
import { DebuggerLauncherScriptProvider } from "../debugger/debugClients/launcherProvider";
import { LocalDebugClient } from "../debugger/debugClients/localDebugClient";
import { PythonOutput, PythonOutputStatus } from "./pythonOutput";
import { isNotInstalledError } from "../common/helpers";

export class PythonPreviewManager implements vscode.WebviewPanelSerializer {
    private static readonly _pythonPreviewActiveContextKey = 'pythonPreviewFocus';

    private readonly _previewConfigurationManager = new PythonPreviewConfigurationManager();
    private _previews: PythonPreview[] = [];
    private _activePreview: PythonPreview | undefined = undefined;
    private readonly _disposables: vscode.Disposable[] = [];

    private _debuggerLoaded: Promise<any> | undefined;
    private _debuggerLoadedPromiseResolve!: () => void;
    private _pythonProcess?: PythonProcess;
    private _debugClient?: BaseDebugClient<{}>;
    private _debugServer!: BaseDebugServer;
    private _launchArgs!: LaunchRequestArguments;
    private _cachedOutputs: Map<string, PythonOutput>;
    private _lang?: string;

    public constructor(private readonly _context: vscode.ExtensionContext,
                       private readonly _contentProvider: PythonContentProvider,
                       private readonly _logger: Logger){
        this._disposables.push(vscode.window.registerWebviewPanelSerializer(PythonPreview.viewtype, this));
        this._cachedOutputs = new Map<string, PythonOutput>();
    }

    public dispose(): void {
        disposeAll(this._disposables);
        disposeAll(this._previews);
        this._cachedOutputs.clear();
        this.stopDebugServer();
    }

    public refresh() {
        for (const preview of this._previews) {
            preview.initialContent();
        }
    }

    public updateConfiguration() {
        for (const preview of this._previews) {
            preview.updateConfiguration();
        }
    }

    public preview(resource: vscode.Uri, previewSettings: PreviewSettings): void {
        // 第一次预览，首先创建调试器。
        if (this._debuggerLoaded === undefined) {
            this._launchArgs = {
                pythonPath: 'python'
            };
            this._debuggerLoaded = new Promise(resolve => {
                this._debuggerLoadedPromiseResolve = resolve;
            });
            this.createDebugger(this._launchArgs);
        }
        // 这段代码永远找不到已存在的preview，原因是preview的列输入参数是vscode.ViewColumn.Beside或者vscode.ViewColumn.Beside！！！
        let preview = this.getExistingPreview(resource, previewSettings);
        if (preview) {
            preview.reveal(previewSettings.previewColumn);
        } else {
            preview = this.createNewPreview(resource, previewSettings);
            preview.initialContent();
        }
    }

    public get activePreviewResource(): vscode.Uri | undefined {
        return this._activePreview && this._activePreview.resource;
    }

    public get lang() {
        return this._lang;
    }

    public toggleLock() {
        const preview = this._activePreview;
        if (preview) {
            preview.toggleLock();
            // 关闭冗余的预览
            for (const otherPreview of this._previews) {
                if (otherPreview !== preview && preview.matches(otherPreview)) {
                    otherPreview.dispose();
                }
            }
        }
    }

    public async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any): Promise<void> {
        
        const preview = await PythonPreview.receive(
            webviewPanel,
            state,
            this,
            this._context,
            this._cachedOutputs,
            this._contentProvider,
            this._previewConfigurationManager,
            this._logger);
        
        this.registerPreview(preview);
    }

    

    private getExistingPreview(resource: vscode.Uri, previewSettings: PreviewSettings): PythonPreview | undefined {
        return this._previews.find(preview =>
            preview.matchesResource(resource, previewSettings.previewColumn, previewSettings.locked));
    }

    private createNewPreview(resource: vscode.Uri, previewSettings: PreviewSettings): PythonPreview {
        const preview = PythonPreview.create(resource,
                                             previewSettings.previewColumn,
                                             previewSettings.locked,
                                             this,
                                             this._context,
                                             this._cachedOutputs,
                                             this._contentProvider,
                                             this._previewConfigurationManager,
                                             this._logger);

        this.setPreviewActiveContext(true);
        this._activePreview = preview;
        return this.registerPreview(preview);
    }

    private registerPreview(preview: PythonPreview): PythonPreview {
        this._previews.push(preview);

        preview.onDidDispose(() => {
            const existing = this._previews.indexOf(preview);
            if (existing === -1) {
                return;
            }
            this._previews.splice(existing, 1);
            if (this._activePreview === preview) {
                this.setPreviewActiveContext(false);
                this._activePreview = undefined;
            }
            if (this._previews.length === 0) {
                this.stopDebugServer();
                this._cachedOutputs.clear();
            } else {
                const isSameResource = this._previews.some(item => {
                    if (item.resource.fsPath == preview.resource.fsPath) return true;
                });
                if (!isSameResource && this._cachedOutputs.has(preview.resource.fsPath)) {
                    this._cachedOutputs.delete(preview.resource.fsPath);
                }
            }

        });

        preview.onDidChangeViewState(({ webviewPanel }) => {
            disposeAll(this._previews.filter(otherPreview => preview !== otherPreview && preview!.matches(otherPreview)));
            this.setPreviewActiveContext(webviewPanel.active);
            this._activePreview = webviewPanel.active ? preview : undefined;
        });

        return preview;
    }

    private setPreviewActiveContext(value: boolean) {
        vscode.commands.executeCommand('setContext', PythonPreviewManager._pythonPreviewActiveContextKey, value);
    }
    
    public createDebugger(args: LaunchRequestArguments): void {
        try {
            args.pythonPath = getPythonExecutable(args.pythonPath);
        } catch (ex) { }

        this._launchArgs = args;
        let launchScriptProvider = new DebuggerLauncherScriptProvider();
        this._debugClient = new LocalDebugClient(args, launchScriptProvider, this, this._logger);
        
        const that = this;
        this.startDebugServer().then(debugServer => {
            this._logger.info(`Started Debug Server. It is listening port - ${debugServer.port}`);
            return that._debugClient!.launchApplicationToDebug(debugServer);
        }).catch(error => {
            let errorMsg = typeof error === 'string' ? error : ((error.message && error.message.length > 0) ? error.message : error);
            if (isNotInstalledError(error)) {
                errorMsg = `Failed to launch the Python Process, please valiate the path '${this._launchArgs.pythonPath}'`;
            }
            vscode.window.showErrorMessage(errorMsg);
            this._logger.error('Starting Debugger with error.', errorMsg);
            this.dispose();
        });
    }

    private initializeEventHandlers() {
        const pythonProcess = this._pythonProcess!;
        pythonProcess.on('processLoaded', pythonVersion => this.onPythonProcessLoaded(pythonVersion));
        pythonProcess.on('output', (fileName, output) => this.onDebuggerOutput(fileName, output));
        pythonProcess.on('detach', () => this.onDetachDebugger());

        this._debugServer.on('detach', () => this.onDetachDebugger());
    }

    public postMessageToDebugger(fileName: string, code: string) {
        if (this._debuggerLoaded === undefined) {
            this._launchArgs = {
                pythonPath: 'python'
            };
            this._debuggerLoaded = new Promise(resolve => {
                this._debuggerLoadedPromiseResolve = resolve;
            });
            this.createDebugger(this._launchArgs);
        }
        this._debuggerLoaded.then(() => {
            let output = this._cachedOutputs.get(fileName);
            // 第一次传送数据，则直接传送
            if (!output) {
                this._cachedOutputs.set(fileName, new PythonOutput());
                this.sendMessage(fileName, code);
                output.status = PythonOutputStatus.Initialized;
            } else {
                // 如果是之后的传送，则设置定时器
                clearTimeout(output.throttleTimer);
                output.throttleTimer = setTimeout(() => {
                    this.sendMessage(fileName, code);
                    output.status = PythonOutputStatus.Processing;
                    output.throttleTimer = undefined;
                }, 300);
            }
        });
    }

    private sendMessage(fileName: string, code: string) {
        const config = this._previewConfigurationManager.getConfigCacheForResource(vscode.Uri.file(fileName));
        const folder = PythonPreviewManager.getWorkspacePathOrPathRealtiveToFile(fileName);
        const showAllFrames = config.traceConfig.showAllFrames;
        const allowAllModules = config.traceConfig.allowAllModules;
        const maxExecutedLines = config.traceConfig.maxExecutedLines;
        this._logger.info('Sending executed code to debugger');
        this._pythonProcess!.sendExecutableText(folder, fileName, code, showAllFrames, allowAllModules, maxExecutedLines);
    }

    private static getWorkspacePathOrPathRealtiveToFile(fileName: string) {
        let root = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fileName));
        if (root) {
            return root.uri.fsPath;
        }
        return path.dirname(fileName);
    }

    private onPythonProcessLoaded(pythonVersion: string) {
        this._logger.info('Python Process loaded');
        this._lang = `Python ${pythonVersion}`;
        this._debuggerLoadedPromiseResolve();
    }

    private onDebuggerOutput(fileName: string, output: string) {
        const data = JSON.parse(output);
        let cacheOutput = this._cachedOutputs.get(fileName)!;
        cacheOutput.status = PythonOutputStatus.Prcoessed;
        cacheOutput.trace = data;
        this._previews.forEach(item => {
            if (item.isPreviewOf(vscode.Uri.file(fileName))) {
                if (item.visibale) {
                    item.updateContent();
                }
            }
        });
    }

    public onDetachDebugger() {
        this.stopDebugServer();
    }

    private startDebugServer(): Promise<IDebugServer> {
        this._pythonProcess = new PythonProcess(0, '');
        this._debugServer = this._debugClient!.createDebugServer(this._pythonProcess);
        this.initializeEventHandlers();
        this._logger.info('Starting Debug Server');
        return this._debugServer.start();
    }

    private stopDebugServer() {
        if (this._debugClient) {
            this._debugClient!.stop();
            this._debugClient = undefined;
        }
        if (this._pythonProcess) {
            this._pythonProcess!.kill();
            this._pythonProcess = undefined;
        }
        this._debuggerLoaded = undefined;
        if (this._lang) {
            this._lang = undefined;
            this._logger.info('Debugger exited');
        }
    }

}

export interface PreviewSettings {
    readonly resourceColumn: vscode.ViewColumn;
    readonly previewColumn: vscode.ViewColumn;
    readonly locked: boolean;
}