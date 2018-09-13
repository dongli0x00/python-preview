import * as vscode from 'vscode';
import * as path from "path";

import {PythonContentProvider} from "./previewContentProvider";
import {PythonPreviewConfigurationManager} from "./previewConfig";
import {Logger} from "../common/logger";
import {disposeAll} from "../common/dispose";
import { PythonPreviewManager } from './previewManager';
import { isPythonFile } from '../common/file';
import { PythonOutput, PythonOutputStatus } from './pythonOutput';

export interface PreviewState {
    readonly resource: string;
    readonly locked: boolean;
    readonly startingInstruction: number
    readonly width: number;
}

export class PythonPreview {
    public static viewtype = 'pythonPreview';

    private _resource: vscode.Uri;
    private _locked: boolean;
    private _startingInstrcution: number | undefined;

    private _codAndNavWidth: number | undefined;

    private readonly _webviewPanel: vscode.WebviewPanel;
    private readonly _disposables: vscode.Disposable[] = [];
    private _currentVersion?: { resource: vscode.Uri, version: number };
    private _disposed: boolean = false;
    private readonly _onDidDisposeEmitter = new vscode.EventEmitter<void>();
    public readonly onDidDispose = this._onDidDisposeEmitter.event;

    private readonly _onDidChangeViewStateEmitter = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
    public readonly onDidChangeViewState = this._onDidChangeViewStateEmitter.event;



    // 反序列化时使用
    public static async receive(webviewPanel: vscode.WebviewPanel,
                                state: PreviewState,
                                previewManager: PythonPreviewManager,
                                context: vscode.ExtensionContext,
                                cachedOutputs: Map<string, PythonOutput>,
                                contentProvider: PythonContentProvider,
                                previewConfigurationManager: PythonPreviewConfigurationManager,
                                logger: Logger): Promise<PythonPreview> {
        const resource = vscode.Uri.parse(state.resource);
        const locked = state.locked;
        const startingInstruction = state.startingInstruction;
        const width = state.width;

        const preview = new PythonPreview(webviewPanel,
                                          resource,
                                          locked,
                                          startingInstruction,
                                          width,
                                          previewManager,
                                          context,
                                          cachedOutputs,
                                          contentProvider,
                                          previewConfigurationManager,
                                          logger);

        await preview.doUpdate();
        return preview;
    }

    public static create(resource: vscode.Uri,
                         previewColumn: vscode.ViewColumn,
                         locked: boolean,
                         previewManager: PythonPreviewManager,
                         context: vscode.ExtensionContext,
                         cachedOutputs: Map<string, PythonOutput>,
                         contentProvider: PythonContentProvider,
                         previewConfigurationManager: PythonPreviewConfigurationManager,
                         logger: Logger): PythonPreview {
        const webviewPanel = vscode.window.createWebviewPanel(PythonPreview.viewtype,
                                                              PythonPreview.getPreviewTitle(resource, locked),
                                                              previewColumn,
                                                              {
                                                                  enableFindWidget: true,
                                                                  ...PythonPreview.getWebviewOptions(resource, context)
                                                              });
        return new PythonPreview(webviewPanel,
                                 resource,
                                 locked,
                                 undefined,
                                 undefined,
                                 previewManager,
                                 context,
                                 cachedOutputs,
                                 contentProvider,
                                 previewConfigurationManager,
                                 logger);
    }

    private constructor(webviewPanel: vscode.WebviewPanel,
                        resource: vscode.Uri,
                        locked: boolean,
                        staringInstruction: number | undefined,
                        width: number | undefined,
                        private readonly _previewManager: PythonPreviewManager,
                        private readonly _context: vscode.ExtensionContext,
                        private readonly _cachedOutputs: Map<string, PythonOutput>,
                        private readonly _contentProvider: PythonContentProvider,
                        private readonly _previewConfigurationManager: PythonPreviewConfigurationManager,
                        private readonly _logger: Logger) {
        this._resource = resource;
        this._locked = locked;
        this._startingInstrcution = staringInstruction;
        this._codAndNavWidth = width;
        this._webviewPanel = webviewPanel;

        this._webviewPanel.onDidDispose(() => {
            this.dispose();
        }, null, this._disposables);

        this._webviewPanel.onDidChangeViewState(e => {
            this.updateContentWithStatus(true);
            this._onDidChangeViewStateEmitter.fire(e);
        }, null, this._disposables);

        // 处理来自webview的消息
        this._webviewPanel.webview.onDidReceiveMessage(e => {
            if (e.source !== this._resource.toString()) {
                return;
            }

            switch (e.type) {
                case 'command':
                    vscode.commands.executeCommand(e.body.command, ...e.body.args);
                    break;
                case 'updateStartingInstruction':
                    this.onDidUpdateStartingInstruction(e.body.curInstr);
                    break;
                case 'updateCodAndNavWidth':
                    this.onDidUpdataCodAndNavWidth(e.body.width);
                    break;
            }
        }, null, this._disposables);

        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isPreviewOf(event.document.uri)) {
                // 文本改变直接传送给调试器，等待调试器返回trace
                this._previewManager.postMessageToDebugger(event.document.fileName, event.document.getText());
            }
        }, null, this._disposables);

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && isPythonFile(editor.document) && !this._locked) {
                this.update(editor.document.uri);
            }
        }, null, this._disposables);
    }

    public get resource(): vscode.Uri {
        return this._resource;
    }

    public get locked(): boolean {
        return this._locked;
    }

    public get state(): PreviewState {
        return {
            resource: this._resource.toString(),
            locked: this._locked,
            startingInstruction: this._startingInstrcution,
            width: this._codAndNavWidth
        };
    }

    public get visibale(): boolean {
        return this._webviewPanel.visible;
    }

    public get position(): vscode.ViewColumn | undefined {
        return this._webviewPanel.viewColumn;
    }

    public get disposed(): boolean {
        return this._disposed;
    }

    public dispose() {
        if (this._disposed) {
            return;
        }

        this._disposed = true;
        this._onDidDisposeEmitter.fire();

        this._onDidDisposeEmitter.dispose();
        this._onDidChangeViewStateEmitter.dispose();
        this._webviewPanel.dispose();

        disposeAll(this._disposables);
        
    }

    public updateConfiguration() {
        if (this._previewConfigurationManager.hasConfigurationChanged(this._resource)) {
            this.initialContent();
        }
    }

    public update(resource: vscode.Uri) {
        const isResourceChange = resource.fsPath !== this._resource.fsPath;
        if (isResourceChange) {
            this._resource = resource;
            this._startingInstrcution = undefined;
            this.initialContent();
        }
    }

    public async doUpdate(): Promise<void> {
        const document = await vscode.workspace.openTextDocument(this._resource);
        this._currentVersion = { resource: this._resource, version: document.version };
        this._webviewPanel.title = PythonPreview.getPreviewTitle(this._resource, this._locked);
        this._webviewPanel.webview.options = PythonPreview.getWebviewOptions(this._resource, this._context);
        this._webviewPanel.webview.html = this._contentProvider.provideTextDocumentContent(document, this._previewConfigurationManager, this.state);
        this._previewManager.postMessageToDebugger(document.fileName, document.getText());
    }

    public async initialContent(): Promise<void> {
        const document = await vscode.workspace.openTextDocument(this._resource);
        
        this._webviewPanel.title = PythonPreview.getPreviewTitle(this._resource, this._locked);
        this._webviewPanel.webview.options = PythonPreview.getWebviewOptions(this._resource, this._context);
        this._webviewPanel.webview.html = this._contentProvider.provideTextDocumentContent(document, this._previewConfigurationManager, this.state);

        this._previewManager.postMessageToDebugger(document.fileName, document.getText());
    }

    public async updateContent(): Promise<void> {
        const document = await vscode.workspace.openTextDocument(this._resource);
        if (this._currentVersion && this._resource.fsPath === this._currentVersion.resource.fsPath && document.version === this._currentVersion.version) {
            this.updateContentWithStatus(true);
        } else {
            this.updateContentWithStatus(false);
        }
        this._currentVersion = { resource: this._resource, version: document.version };
    }

    public updateStatus() {
        this._startingInstrcution = undefined;
    }

    public updateContentWithStatus(hasStatus: boolean) {
        const cacheOutput = this._cachedOutputs.get(this._resource.fsPath);
        // 如果此时还没有缓存的输出或者正在调试中，则直接返回
        if (!cacheOutput || cacheOutput.status !== PythonOutputStatus.Prcoessed) return;
        const config = this._previewConfigurationManager.getConfigCacheForResource(this._resource);
        if (this._codAndNavWidth === undefined) {
            this._codAndNavWidth = config.contentConfig.codAndNavWidth;
        }
        const options = {
            jumpToEnd: true,
            startingInstruction: undefined,
            disableHeapNesting: config.contentConfig.disableHeapNesting,
            textualMemoryLabels: config.contentConfig.textualMemoryLabels,
            compactFuncLabels: config.contentConfig.compactFuncLabels,
            showAllFrameLabels: config.contentConfig.showAllFrameLabels,
            hideCode: config.contentConfig.hideCode,
            lang: this._previewManager.lang,
            width: this._codAndNavWidth
        };
        if (hasStatus) options.startingInstruction = this._startingInstrcution;
        if (this.position) {
            this._logger.info(`Updating ${PythonPreview.getPreviewTitle(this._resource, this._locked)} (Group ${this.position})`);
        } else {
            this._logger.info(`Updating ${PythonPreview.getPreviewTitle(this._resource, this._locked)}`);
        }
        this.postMessage({
            type: 'updateContent',
            data: cacheOutput.trace,
            options: options
        });
    }

    public matchesResource(otherResource: vscode.Uri,
                           otherPosition: vscode.ViewColumn | undefined,
                           otherLocked: boolean): boolean {
        if (this.position !== otherPosition) {
            return false;
        }

        if (this._locked !== otherLocked) {
            return false;
        }

        return this.isPreviewOf(otherResource);
    }

    public matches(otherPreview: PythonPreview): boolean {
        return this.matchesResource(otherPreview._resource, otherPreview.position, otherPreview._locked);
    }

    public reveal(viewColumn: vscode.ViewColumn) {
        this._webviewPanel.reveal(viewColumn);
    }

    public toggleLock() {
        this._locked = !this._locked;
        this._webviewPanel.title = PythonPreview.getPreviewTitle(this._resource, this._locked);
        this.postMessage({
            type: 'updateLock',
            locked: this._locked
        });
    }

    public isPreviewOf(resource: vscode.Uri): boolean {
        return this._resource.fsPath === resource.fsPath;
    }

    public static getPreviewTitle(resource: vscode.Uri, locked: boolean): string {
        return locked
            ? `[Preview] ${path.basename(resource.fsPath)}`
            : `Preview ${path.basename(resource.fsPath)}`;
    }

    private postMessage(msg: any) {
        if (!this._disposed) {
            this._webviewPanel.webview.postMessage(msg);
        }
    }

    private static getWebviewOptions(resource: vscode.Uri, context: vscode.ExtensionContext): vscode.WebviewOptions {
        return {
            enableScripts: true,
            enableCommandUris: true,
            localResourceRoots: PythonPreview.getLocalResourceRoots(resource, context)
        };
    }

    private static getLocalResourceRoots(resource: vscode.Uri, context: vscode.ExtensionContext): vscode.Uri[] {
        const baseRoots = [vscode.Uri.file(context.extensionPath)];

        const folder = vscode.workspace.getWorkspaceFolder(resource);
        folder && baseRoots.push(folder.uri);

        (!resource.scheme || resource.scheme === 'file') && baseRoots.push(vscode.Uri.file(path.dirname(resource.fsPath)));

        return baseRoots;
    }

    private onDidUpdateStartingInstruction(curInstr: number) {
        this._startingInstrcution = curInstr;
    }

    private onDidUpdataCodAndNavWidth(width: number) {
        this._codAndNavWidth = width;
    }
}