import * as vscode from 'vscode';


enum ReloadType {
    ReloadStyle = 1,

    ReloadContent = 2,
    
    ReloadTrace = 3
}

class StyleConfiguration {
    [key: string]: any;
    public readonly fontFamily: string | undefined;
    public readonly fontSize: number;
    public readonly langDisplayFF: string | undefined;
    public readonly langDisplayFS: number;
    public readonly codeFF: string | undefined;
    public readonly codeFS: number;
    public readonly codeLH: number;
    public readonly legendFF: string | undefined;
    public readonly legendFS: number;
    public readonly  codeFooterDocsFF: string | undefined;
    public readonly codeFooterDocsFS: number;
    public readonly printOutputDocsFF: string | undefined;
    public readonly printOutputDocsFS: number;
    public readonly pyStdoutFF: string | undefined;
    public readonly pyStdoutFs: number;
    public readonly stackAndHeapHeaderFF: string | undefined;
    public readonly stackAndHeapHeaderFS: number;
    public readonly stackFrameFF: string | undefined;
    public readonly stackFrameFS: number;
    public readonly retValFS: number;
    public readonly stackFrameHeaderFF: string | undefined;
    public readonly stackFrameHeaderFS: number;
    public readonly heapObjectFF: string | undefined;
    public readonly heapObjectFS: number;
    public readonly typeLabelFF: string | undefined;
    public readonly typeLabelFS: number;
    public readonly light_highlightedArrow_color: string;
    public readonly light_highlightedStackFrame_bgColor: string;
    public readonly light_list_tuple_setTbl_bgColor: string;
    public readonly light_dict_class_instKey_bgColor: string;
    public readonly light_dict_class_instVal_bgColor: string;
    public readonly dark_highlightedArrow_color: string;
    public readonly dark_highlightedStackFrame_bgColor: string;
    public readonly dark_list_tuple_setTbl_bgColor: string;
    public readonly dark_dict_class_instKey_bgColor: string;
    public readonly dark_dict_class_instVal_bgColor: string;
    public readonly highContrast_highlightedArrow_color: string;
    public readonly highContrast_highlightedStackFrame_bgColor: string;
    public readonly highContrast_list_tuple_setTbl_bgColor: string;
    public readonly highContrast_dict_class_instKey_bgColor: string;
    public readonly highContrast_dict_class_instVal_bgColor: string;
    public readonly styles: string[];

    public constructor(pythonConfig: vscode.WorkspaceConfiguration) {
        this.fontFamily = pythonConfig.get<string | undefined>('fontFamliy', undefined);
        this.fontSize = Math.max(16, +pythonConfig.get<number>('fontSize', NaN));
        this.langDisplayFF = pythonConfig.get<string | undefined>('langDisplay.fontFamily', undefined);
        this.langDisplayFS = Math.max(14, +pythonConfig.get<number>('langDisplay.fontSize', NaN));
        this.codeFF = pythonConfig.get<string | undefined>('code.fontFamily', undefined);
        this.codeFS = Math.max(15, +pythonConfig.get<number>('code.fontSize', NaN));
        this.codeLH = Math.max(1, +pythonConfig.get<number>('code.lineHeight', NaN));
        this.legendFF = pythonConfig.get<string | undefined>('legend.fontFamily', undefined);
        this.legendFS = Math.max(12, +pythonConfig.get<number>('legend.fontSize', NaN));
        this.codeFooterDocsFF = pythonConfig.get<string | undefined>('codeFooterDocs.fontFamily', undefined);
        this.codeFooterDocsFS = Math.max(12, +pythonConfig.get<number>('codeFooterDocs.fontSize', NaN));
        this.printOutputDocsFF = pythonConfig.get<string | undefined>('printOutputDocs.fontFamily', undefined);
        this.printOutputDocsFS = Math.max(12, +pythonConfig.get<number>('printOutputDocs.fontSize', NaN));
        this.pyStdoutFF = pythonConfig.get<string | undefined>('progOutputs.fontFamily', undefined);
        this.pyStdoutFs = Math.max(14, +pythonConfig.get<number>('progOutputs.fontSize', NaN));
        this.stackAndHeapHeaderFF = pythonConfig.get<string | undefined>('stackAndHeapHeader.fontFamily', undefined);
        this.stackAndHeapHeaderFS = Math.max(14, +pythonConfig.get<number>('stackAndHeapHeader.fontSize', NaN));
        this.stackFrameFF = pythonConfig.get<string | undefined>('stackFrame.fontFamily', undefined);
        this.stackFrameFS = Math.max(14, +pythonConfig.get<number>('stackFrame.fontSize', NaN));
        this.retValFS = Math.max(12, +pythonConfig.get<number>('retVal.fontSize', NaN));
        this.stackFrameHeaderFF = pythonConfig.get<string | undefined>('stackFrameHeder.fontFamily', undefined);;
        this.stackFrameHeaderFS = Math.max(14, +pythonConfig.get<number>('stackFrameHeader.fontSize', NaN));
        this.heapObjectFF = pythonConfig.get<string | undefined>('heapObject.fontFamily', undefined);
        this.heapObjectFS = Math.max(14, +pythonConfig.get<number>('heapObject.fontSize', NaN));
        this.typeLabelFF = pythonConfig.get<string | undefined>('typeLabel.fontFamily', undefined);
        this.typeLabelFS = Math.max(12, +pythonConfig.get<number>('typeLabel.fontSize', NaN));
        
        this.light_highlightedArrow_color = pythonConfig.get<string>('light.highlightedArrow.color');
        this.light_highlightedStackFrame_bgColor = pythonConfig.get<string>('light.highlightedStackFrame.bgColor');
        this.light_list_tuple_setTbl_bgColor = pythonConfig.get<string>('light.list-tuple-setTbl.bgColor');
        this.light_dict_class_instKey_bgColor = pythonConfig.get<string>('light.dict-class-instKey.bgColor');
        this.light_dict_class_instVal_bgColor = pythonConfig.get<string>('light.dict-class-instVal.bgColor');

        this.dark_highlightedArrow_color = pythonConfig.get<string>('dark.highlightedArrow.color');
        this.dark_highlightedStackFrame_bgColor = pythonConfig.get<string>('dark.highlightedStackFrame.bgColor');
        this.dark_list_tuple_setTbl_bgColor = pythonConfig.get<string>('dark.list-tuple-setTbl.bgColor');
        this.dark_dict_class_instKey_bgColor = pythonConfig.get<string>('dark.dict-class-instKey.bgColor');
        this.dark_dict_class_instVal_bgColor = pythonConfig.get<string>('dark.dict-class-instVal.bgColor');

        this.highContrast_highlightedArrow_color = pythonConfig.get<string>('high-contrast.highlightedArrow.color');
        this.highContrast_highlightedStackFrame_bgColor = pythonConfig.get<string>('high-contrast.highlightedStackFrame.bgColor');
        this.highContrast_list_tuple_setTbl_bgColor = pythonConfig.get<string>('high-contrast.list-tuple-setTbl.bgColor');
        this.highContrast_dict_class_instKey_bgColor = pythonConfig.get<string>('high-contrast.dict-class-instKey.bgColor');
        this.highContrast_dict_class_instVal_bgColor = pythonConfig.get<string>('high-contrast.dict-class-instVal.bgColor');
        this.styles = pythonConfig.get<string[]>('styles', []);
    }

    public equals(otherConfig: StyleConfiguration) {
        for (let key in this) {
            if (this.hasOwnProperty(key) && key !== 'styles' && this[key] !== otherConfig[key]) {
                    return false;
            }
        }

        if (this.styles.length !== otherConfig.styles.length) {
            return false;
        }

        for (let i = 0; i < this.styles.length; ++i) {
            if (this.styles[i] !== otherConfig.styles[i]) {
                return false;
            }
        }

        return true;
    }
}

class ContentConfiguration {
    [key: string]: any;
    public readonly disableHeapNesting: boolean;
    public readonly textualMemoryLabels: boolean;
    public readonly compactFuncLabels: boolean;
    public readonly showAllFrameLabels: boolean;
    public readonly hideCode: boolean;
    public readonly codAndNavWidth: number;

    public constructor(pythonConfig: vscode.WorkspaceConfiguration) {
        this.disableHeapNesting = !!pythonConfig.get<boolean>('disableHeapNesting', false);
        this.textualMemoryLabels = !!pythonConfig.get<boolean>('textualMemoryLabels', false);
        this.compactFuncLabels = !!pythonConfig.get<boolean>('compactFuncLabels', false);
        this.showAllFrameLabels = !!pythonConfig.get<boolean>('showAllFrameLabels', false);
        this.hideCode = !!pythonConfig.get<boolean>('hideCode', false);
        this.codAndNavWidth = Math.max(510, +pythonConfig.get<number>('codAndNavWidth', 510));
    }

    public equals(otherConfig: ContentConfiguration) {
        for (let key in this) {
            if (this.hasOwnProperty(key) && this[key] !== otherConfig[key]) {
                return false;
            }
        }
        return true;
    }
}

class TraceConfiguration {
    [key: string]: any;
    public readonly showAllFrames: boolean;
    public readonly allowAllModules: boolean;

    public readonly maxExecutedLines: number;

    public constructor(pythonConfig: vscode.WorkspaceConfiguration) {
        this.showAllFrames = !!pythonConfig.get<boolean>('showAllFrames', true);
        this.allowAllModules = !!pythonConfig.get<boolean>('allowAllModules', true);
        this.maxExecutedLines = Math.max(1000, +pythonConfig.get<number>('maxExecutedLines', 1000));
    }

    public equals(otherConfig: TraceConfiguration) {
        for (let key in this) {
            if (this.hasOwnProperty(key) && this[key] !== otherConfig[key]) {
                return false;
            }
        }
        return true;
    }
}

export class PythonPreviewConfiguration {
    public static getForResource(resouce: vscode.Uri) {
        return new PythonPreviewConfiguration(resouce);
    }

    public readonly styleConfig: StyleConfiguration;
    public readonly contentConfig: ContentConfiguration;
    public readonly traceConfig: TraceConfiguration;
    
    private constructor(resource: vscode.Uri) {
        const pythonConfig = vscode.workspace.getConfiguration('pythonPreview', resource);
        this.styleConfig = new StyleConfiguration(pythonConfig);
        this.contentConfig = new ContentConfiguration(pythonConfig);
        this.traceConfig = new TraceConfiguration(pythonConfig);
    }

    public equals(otherConfig: PythonPreviewConfiguration) {
        if (!this.styleConfig.equals(otherConfig.styleConfig)) return false;
        if (!this.contentConfig.equals(otherConfig.contentConfig)) return false;
        if (!this.traceConfig.equals(otherConfig.traceConfig)) return false;
        return true;
    }
}

export class PythonPreviewConfigurationManager {
    private readonly _previewConfigurationsForWorkspaces = new Map<string, PythonPreviewConfiguration>();

    public loadAndCacheConfiguration(resource: vscode.Uri): PythonPreviewConfiguration {
        const config = PythonPreviewConfiguration.getForResource(resource);
        this._previewConfigurationsForWorkspaces.set(this.getKey(resource), config);
        return config;
    }

    public getConfigCacheForResource(resource: vscode.Uri): PythonPreviewConfiguration {
        let config = this._previewConfigurationsForWorkspaces.get(this.getKey(resource));
        if (!config) {
            config = PythonPreviewConfiguration.getForResource(resource);
            this._previewConfigurationsForWorkspaces.set(this.getKey(resource), config);
        }
        return config;
    }

    public hasConfigurationChanged(resource: vscode.Uri): boolean {
        const key = this.getKey(resource);
        const currentConfig = this._previewConfigurationsForWorkspaces.get(key);
        const newConfig = PythonPreviewConfiguration.getForResource(resource);
        return !(currentConfig && currentConfig.equals(newConfig));
    }

    private getKey(resource: vscode.Uri): string {
        const folder = vscode.workspace.getWorkspaceFolder(resource);
        return folder ? folder.uri.toString() : '';
    }
}