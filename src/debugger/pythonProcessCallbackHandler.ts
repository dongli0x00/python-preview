'use strict';

import {EventEmitter} from "events";
import {IPythonProcess} from "./common/contracts";
import {SocketStream} from "../common/net/socket/socketStream";

export class PythonProcessCallbackHandler extends EventEmitter {
    private _pythonProcess: IPythonProcess;
    private _stream: SocketStream;

    constructor(pythonProcess: IPythonProcess, stream: SocketStream) {
        super();
        this._pythonProcess = pythonProcess;
        this._stream =stream;
    }

    public handleIncomingData() {
        if (this._stream.length === 0) {
            return;
        }

        this._stream.beginTransaction();

        let cmd = this._stream.readAsciiString(4);
        if (this._stream.hasInsufficientDataForReading) {
            return;
        }

        switch (cmd) {
            case 'LOAD': this.handleProcessLoad(); break;
            case 'OUTP': this.handleDebuggerOutput(); break;
            case 'DETC': this.handleDetach(); break;
            default:
                this.emit('error', `Unhandled command '${cmd}'`);
        }

        if (this._stream.hasInsufficientDataForReading) {
            this._stream.rollBackTransaction();
            return;
        }

        this._stream.endTransaction();
        if (this._stream.length > 0) {
            this.handleIncomingData();
        }
    }

    private handleProcessLoad() {
        let pythonVersion = this._stream.readString();
        if (this._stream.hasInsufficientDataForReading) {
            return;
        }
        this.emit('processLoaded', pythonVersion);
    }

    private handleDebuggerOutput() {
        let fileName = this._stream.readString();
        let output = this._stream.readString();
        if (this._stream.hasInsufficientDataForReading) {
            return;
        }
        this.emit("output", fileName, output);
    }

    private handleDetach() {
        this.emit('detach');
    }
}