import * as net from 'net';
import * as assert from 'assert';

import { SocketStream } from '../../../common/net/socket/socketStream';
const uint64be = require('uint64be');

class MockSocket {
    private _rawDataWritten: any;
    constructor(private _data: string = '') { }

    public get dataWritten(): string {
        return this._data;
    }

    public get rawDataWritten(): any {
        return this._rawDataWritten;
    }

    write(data: any) {
        this._data = data + '';
        this._rawDataWritten = data;
    }
}

suite('SocketStream', () => {
    test('Read Byte', done => {
        let buffer = Buffer.from('P');
        const byteValue = buffer[0];
        const socket = new MockSocket();
        const stream = new SocketStream((socket as any) as net.Socket, buffer);

        assert.equal(stream.readByte(), byteValue);
        done();
    });

    test('Read Int32', done => {
        const max = 2147483648;
        const socket = new MockSocket();
        let buffer = uint64be.encode(max);
        const stream = new SocketStream((socket as any) as net.Socket, buffer);

        assert.equal(stream.readInt32(), max);
        done();
    });

    test('Read Int64', done => {
        const max = 9223372036854775807;
        const socket = new MockSocket();
        let buffer = uint64be.encode(max);
        const stream = new SocketStream((socket as any) as net.Socket, buffer);

        assert.equal(stream.readInt64(), max);
        done();
    });

    test('Read Ascii String', done => {
        const message = 'Hello World';
        const socket = new MockSocket();
        let buffer = Buffer.concat([Buffer.from('A'), uint64be.encode(message.length), Buffer.from(message)]);
        const stream = new SocketStream((socket as any) as net.Socket, buffer);

        assert.equal(stream.readString(), message);
        done();
    })

    test('Read Unicode String', done => {
        const message = 'Hello World - Функция проверки ИНН и КПП - 说明';
        const socket = new MockSocket();
        const stringBuffer = Buffer.from(message);
        let buffer = Buffer.concat([Buffer.from('U'), uint64be.encode(stringBuffer.byteLength), stringBuffer]);
        const stream = new SocketStream((socket as any) as net.Socket, buffer);

        assert.equal(stream.readString(), message);
        done();
    });


})