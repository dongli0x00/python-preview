'use strict';

import * as net from "net";

const uint64be = require('uint64be');

export class SocketStream {
    private _socket: net.Socket;
    private _buffer: Buffer;
    private _isInTransaction: boolean;
    private _bytesRead: number = 0;
    private _hasInsufficientDataForReading: boolean = false;

    public constructor(socket: net.Socket, buffer: Buffer) {
        this._socket = socket;
        this._buffer = buffer;
    }

    public get buffer(): Buffer {
        return this._buffer;
    }

    public get hasInsufficientDataForReading(): boolean {
        return this._hasInsufficientDataForReading;
    }

    public get length(): number {
        return this._buffer.length;
    }

    public writeInt32(num: number) {
        this.writeInt64(num);
    }

    public writeInt64(num: number) {
        let buffer = uint64be.encode(num);
        this._socket.write(buffer);
    }

    public writeString(str: string) {
        let stringBuffer = Buffer.from(str);
        this.writeInt32(stringBuffer.length);
        if (stringBuffer.length > 0) {
            this._socket.write(stringBuffer);
        }
    }

    public write(buffer: Buffer) {
        this._socket.write(buffer);
    }

    public clearErrors() {
        this._hasInsufficientDataForReading = false;
    }

    public beginTransaction() {
        this._isInTransaction = true;
        this._bytesRead = 0;
        this.clearErrors();
    }

    public endTransaction() {
        this._isInTransaction = false;
        this._buffer = this._buffer.slice(this._bytesRead);
        this._bytesRead = 0;
        this.clearErrors();
    }

    public rollBackTransaction() {
        this._isInTransaction = false;
        this._bytesRead = 0;
        this.clearErrors();
    }

    public toString(): string {
        return this._buffer.toString();
    }

    public append(additionalData: Buffer) {
        if (this._buffer.length === 0) {
            this._buffer = additionalData;
            return;
        }
        let newBuffer = Buffer.alloc(this._buffer.length + additionalData.length);
        this._buffer.copy(newBuffer);
        additionalData.copy(newBuffer, this._buffer.length);
        this._buffer = newBuffer;
    }

    private isSufficientDataAvailable(length: number): boolean {
        if (this._buffer.length < (this._bytesRead + length)) {
            this._hasInsufficientDataForReading = true;
        }

        return !this._hasInsufficientDataForReading;
    }

    public readByte(): number {
        if (!this.isSufficientDataAvailable(1)) {
            return null;
        }

        let value = this._buffer.slice(this._bytesRead, this._bytesRead + 1)[0];
        if (this._isInTransaction) {
            this._bytesRead++;
        } else {
            this._buffer = this._buffer.slice(1);
        }
        return value;
    }

    public readInt32(): number {
        return this.readInt64();
    }

    public readInt64(): number {
        if (!this.isSufficientDataAvailable(8)) {
            return null;
        }

        let buf = this._buffer.slice(this._bytesRead, this._bytesRead + 8);

        if (this._isInTransaction) {
            this._bytesRead += 8;
        } else {
            this._buffer = this._buffer.slice(8);
        }

        return uint64be.decode(buf);
    }

    public readString(): string {
        let byteRead = this.readByte();
        if (this._hasInsufficientDataForReading) {
            return null;
        }

        if (byteRead < 0) {
            throw new Error('IOException() - Socket.readString() failed to read string value');
        }

        let type = Buffer.from([byteRead]).toString();
        let isUnicode = false;
        switch (type) {
            case 'N':
                return null;
            case 'U':
                isUnicode = true;
                break;
            case 'A':
                isUnicode = false;
                break;
            default:
                throw new Error(`IOException() - Socket.readString() failed to parse unknown string type ${type}`);
        }

        let len = this.readInt32();
        if (this._hasInsufficientDataForReading) {
            return null;
        }

        if (!this.isSufficientDataAvailable(len)) {
            return null;
        }

        let stringBuffer = this._buffer.slice(this._bytesRead, this._bytesRead + len);
        if (this._isInTransaction) {
            this._bytesRead += len;
        } else {
            this._buffer = this._buffer.slice(len);
        }

        return isUnicode ? stringBuffer.toString() : stringBuffer.toString('ascii');
    }

    public readAsciiString(length: number): string {
        if (!this.isSufficientDataAvailable(length)) {
            return null;
        }

        let stringBuffer = this._buffer.slice(this._bytesRead, this._bytesRead + length);
        if (this._isInTransaction) {
            this._bytesRead += length;
        } else {
            this._buffer = this._buffer.slice(length);
        }

        return stringBuffer.toString('ascii');
    }

    private readValueInTransaction<T>(dataType: DataType, length?: number): T {
        let startedTransaction = false;
        if (!this._isInTransaction) {
            this.beginTransaction();
            startedTransaction = true;
        }
        let data: any;
        switch (dataType) {
            case DataType.int32:
                data = this.readInt32();
                break;
            case DataType.int64:
                data = this.readInt64();
                break;
            case DataType.string:
                data = this.readString();
                break;
            case DataType.asciiString:
                data = this.readAsciiString(length!);
                break;
        }

        if (this._hasInsufficientDataForReading) {
            if (startedTransaction) {
                this.rollBackTransaction();
            }
            return undefined;
        }

        if (startedTransaction) {
            this.endTransaction();
        }
        return data;
    }

    public readInt32InTransaction(): number {
        return this.readValueInTransaction<number>(DataType.int32);
    }

    public readInt64InTransaction(): number {
        return this.readValueInTransaction<number>(DataType.int64);
    }

    public readStringInTransaction(): string {
        return this.readValueInTransaction<string>(DataType.string);
    }

    public readAsciiStringInTransaction(length: number): string {
        return this.readValueInTransaction<string>(DataType.asciiString, length);
    }
}

enum DataType {
    int32,
    int64,
    string,
    asciiString
}