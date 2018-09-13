'use strict';

import {EventEmitter} from "events";
import {createDeferred, Deferred} from "../../common/helpers";
import {Socket} from "net";
import {IDebugServer, IPythonProcess} from "../common/contracts";

export abstract class BaseDebugServer extends EventEmitter {
    protected _clientSocket: Deferred<Socket>;
    protected _pythonProcess:IPythonProcess;
    protected _isRunning: boolean;
    protected _debugClientConnected: Deferred<boolean>;

    constructor(pythonProcess?: IPythonProcess) {
        super();
        this._pythonProcess = pythonProcess;
        this._debugClientConnected = createDeferred<boolean>();
        this._clientSocket = createDeferred<Socket>();
    }

    public get isRunning(): boolean {
        return this._isRunning;
    }

    public get debugClientConnected(): Promise<boolean> {
        return this._debugClientConnected.promise;
    }

    public abstract start(): Promise<IDebugServer>;

    public abstract stop();
}