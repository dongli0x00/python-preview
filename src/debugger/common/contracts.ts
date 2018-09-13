'use strict';

import * as net from "net";

export interface IPythonProcess extends NodeJS.EventEmitter {
    connect(buffer: Buffer, socket: net.Socket): boolean;
    handleInComingData(buffer: Buffer);
    detach();
    kill();
}

export interface IDebugServer {
    port: number;
    host?: string;
}

export interface LaunchRequestArguments {
    pythonPath: string;
    port?: number;
    host?: string;
}