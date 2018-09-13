export interface PreviewState {
    resource: string,
    locked: boolean,
    startingInstruction: number,
    width: number
}

export function getDataState(): PreviewState {
    const element = document.getElementById('vscode-python-preview-data');
    if (element) {
        const dataState = element.getAttribute('data-state')
        if (dataState) {
            return JSON.parse(dataState);
        }
    }

    throw new Error(`Could not load data state`);
}