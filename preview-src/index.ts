import { ExecutionVisualizer } from "./pytutor";
import { getDataState } from "./datas";
import { createPosterForVsCode } from "./messaging";

declare var acquireVsCodeApi: any;

const vscode = acquireVsCodeApi();

// 设置vscode状态
const state = getDataState();
vscode.setState(state);

const messagePoster = createPosterForVsCode(vscode);
let pyOutputPane: ExecutionVisualizer | undefined;


window.addEventListener('message', event => {
    switch(event.data.type) {
        case 'updateContent':
            event.data.options.updateOutputCallback = visualizer => {
                state.startingInstruction = visualizer.curInstr;
                vscode.setState(state);
                messagePoster.postMessage('updateStartingInstruction', { curInstr: visualizer.curInstr });
            }
            pyOutputPane = new ExecutionVisualizer('pyOutputPane', event.data.data, event.data.options);
            pyOutputPane.redrawConnectors();
            break;
        case 'updateLock':
            state.locked = event.data.locked;
            vscode.setState(state);
            break;
    }
});

$(window).resize(() => {
    if (pyOutputPane) {
        pyOutputPane.redrawConnectors();
        let width = document.getElementById('codAndNav').style['width'];
        state.width = parseFloat(width.slice(0, -2));
        messagePoster.postMessage('updateCodAndNavWidth', { width: state.width });
    }
});