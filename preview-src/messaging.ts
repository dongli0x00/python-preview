import { getDataState } from "./datas";

export interface MessagePoster {
    postMessage(type: string, body: object): void;

    postCommand(command: string, args: any[]): void;
}

export const createPosterForVsCode = (vscode: any) => {
    return new class implements MessagePoster {
        postMessage(type: string, body: object): void {
            vscode.postMessage({
                type: type,
                source: getDataState().resource,
                body: body
            });
        }

        postCommand(command: string, args: any[]) {
            this.postMessage('command', { command, args });
        }
    }
}