import * as vscode from 'vscode';

export function isPythonFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'python';
}