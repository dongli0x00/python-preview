'use strict';

import {EventEmitter} from "events";
import {IDebugServer, IPythonProcess} from "../common/contracts";
import {BaseDebugServer} from "../debugServers/baseDebugServer";

export abstract class BaseDebugClient<T> extends EventEmitter {
    constructor(protected _args: T) {
        super();
    }

    public abstract createDebugServer(pythonProcess?: IPythonProcess): BaseDebugServer;

    public stop() { }

    public launchApplicationToDebug(debugServer: IDebugServer): Promise<any> {
        return Promise.resolve();
    }
}