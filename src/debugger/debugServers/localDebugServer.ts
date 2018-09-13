'use strict';

import * as vscode from 'vscode';
import {BaseDebugServer} from "./baseDebugServer";
import * as net from "net";
import {IDebugServer, IPythonProcess, LaunchRequestArguments} from "../common/contracts";
import { Logger } from '../../common/logger';

export class LocalDebugServer extends BaseDebugServer {
    private _debugSocketServer: net.Server | undefined;

    constructor(pythonProcess: IPythonProcess | undefined, private _args: LaunchRequestArguments, private _logger: Logger) {
        super(pythonProcess);
    }

    public stop() {
        if (!this._debugSocketServer) {
            return;
        }

        try {
            this._debugSocketServer.close();
        } catch { }

        this._debugSocketServer = undefined;
    }

    public async start(): Promise<IDebugServer> {
        return new Promise<IDebugServer>((resolve, reject) => {
            let connectedResolve = this._debugClientConnected.resolve.bind(this._debugClientConnected);
            let connected = false;
            let disconnected = false;
            this._debugSocketServer = net.createServer(c => {
                // "connection"监听器
                c.on('data', (buffer: Buffer) => {
                    if (connectedResolve) {
                        // debug客户端已经连接到debug服务器
                        connectedResolve(true);
                        this._logger.info('Debug Client Connected');
                        connectedResolve = null;
                    }
                    if (!connected) {
                        connected = this._pythonProcess.connect(buffer, c);
                    } else {
                        this._pythonProcess.handleInComingData(buffer);
                        this._isRunning = true;
                    }
                });
                c.on('close', d => {
                    disconnected = true;
                    this.emit('detach', d);
                });
                c.on('timeout', () => {
                    const msg = `Debugger client timeout.`;
                    this._logger.warn(msg);
                });
                c.on('error', ex => {
                    if (connected || disconnected) {
                        return;
                    }
                    const msg = `There was an error in starting the debug server. Error = ${JSON.stringify(ex)}`;
                    reject(msg);
                });
            });

            this._debugSocketServer!.on('error', ex => {
                const exMsg = JSON.stringify(ex);
                let msg = '';
                if ((ex as any).code === 'EADDRINUSE') {
                    msg = `The port used for debugging is in use, please try again or try restarting Visual Studio Code, Error = ${exMsg}`;
                } else {
                    if (connected) {
                        return;
                    }
                    msg = `There was an error in starting the debug server. Error = ${exMsg}`;
                }
                reject(msg);
            });

            const port = typeof this._args.port === 'number' ? this._args.port! : 0;
            const host = typeof this._args.host === 'string' && this._args.host!.trim().length > 0 ? this._args.host!.trim() : 'localhost';
            this._debugSocketServer!.listen({port: port, host: host}, () => {
                const server = this._debugSocketServer!.address();
                resolve({port: server.port});
            })
        });
    }
}