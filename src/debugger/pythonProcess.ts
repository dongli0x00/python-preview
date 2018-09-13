'use strict';

import {EventEmitter} from "events";
import {IPythonProcess} from "./common/contracts";
import {PythonProcessCallbackHandler} from "./pythonProcessCallbackHandler";
import {SocketStream} from "../common/net/socket/socketStream";
import * as net from "net";
import { Commands } from "./proxyCommands";

export class PythonProcess extends EventEmitter implements IPythonProcess {
    private _id: number;
    private _guid: string;
    private _callbackHandler: PythonProcessCallbackHandler;
    private _stream: SocketStream;
    private _guidRead: boolean;
    private _statusRead: boolean;
    private _pidRead: boolean;
    private _pid: number;

    constructor(id: number, guid: string) {
        super();
        this._id = id;
        this._guid = guid;
    }

    public kill() {
        if (this._pid && typeof this._pid === 'number') {
            try {
                let kill = require('tree-kill');
                kill(this._pid!);
                this._pid = undefined;
            } catch (e) {
            }

        }
    }

    public detach() {
        this._stream.write(Buffer.from('detc'));
    }

    public connect(buffer: Buffer, socket: net.Socket): boolean {
        if (!this._stream) {
            this._stream = new SocketStream(socket, buffer);
        } else {
            this._stream.append(buffer);
        }

        if (!this._guidRead) {
            this._stream.beginTransaction();
            this._stream.readString();
            if (this._stream.hasInsufficientDataForReading) {
                this._stream.rollBackTransaction();
                return false;
            }
            this._guidRead = true;
            this._stream.endTransaction();
        }

        if (!this._statusRead) {
            this._stream.beginTransaction();
            this._stream.readInt32();
            if (this._stream.hasInsufficientDataForReading) {
                this._stream.rollBackTransaction();
                return false;
            }
            this._statusRead = true;
            this._stream.endTransaction();
        }

        if (!this._pidRead) {
            this._stream.beginTransaction();
            this._pid = this._stream.readInt32();
            if (this._stream.hasInsufficientDataForReading) {
                this._stream.rollBackTransaction();
                return false;
            }
            this._pidRead = true;
            this._stream.endTransaction();
        }

        this._callbackHandler = new PythonProcessCallbackHandler(this, this._stream);
        this._callbackHandler.on('processLoaded', pythonVersion => this.emit('processLoaded', pythonVersion));
        this._callbackHandler.on('output', (fileName, output) => this.emit('output', fileName, output));
        this._callbackHandler.on('detach', () => this.emit('detach'));
        this._callbackHandler.handleIncomingData();
        return true;
    }

    public handleInComingData(buffer: Buffer) {
        this._stream.append(buffer);

        if (!this._guidRead) {
            this._stream.rollBackTransaction();
            this._stream.readString();
            if (this._stream.hasInsufficientDataForReading) {
                return;
            }
            this._guidRead = true;
            this._stream.endTransaction();
        }

        if (!this._statusRead) {
            this._stream.beginTransaction();
            this._stream.readInt32();
            if (this._stream.hasInsufficientDataForReading) {
                this._stream.rollBackTransaction();
                return;
            }
            this._pidRead = true;
            this._stream.endTransaction();
        }

        this._callbackHandler.handleIncomingData();
    }

    public sendExecutableText(folder: string, fileName: string, code: string, showAllFrames: boolean, allowAllModules: boolean, maxExecutedLines: number) {
        this._stream.write(Commands.OutputCommandBytes);
        if (showAllFrames) {
            this._stream.writeInt64(1);
        } else {
            this._stream.writeInt64(0);
        }
        if (allowAllModules) {
            this._stream.writeInt64(1);
        } else {
            this._stream.writeInt64(0);
        }
        this._stream.writeInt64(maxExecutedLines);
        this._stream.writeString(folder);
        this._stream.writeString(fileName);
        this._stream.writeString(code);
    }
}