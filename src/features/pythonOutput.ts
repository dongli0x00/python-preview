export enum PythonOutputStatus {
    Initialized = 1,
    Processing = 2,
    Prcoessed = 3
}

export class PythonOutput {
    private _status: PythonOutputStatus;

    public constructor(private _trace?: any, private _throttleTimer?: NodeJS.Timer) {
        this._status = PythonOutputStatus.Initialized;
    }

    public get trace() {
        return this._trace;
    }

    public set trace(value) {
        this._trace = value;
    }

    public get status() {
        return this._status;
    }

    public set status(value) {
        this._status = value;
    }

    public get throttleTimer() {
        return this._throttleTimer;
    }

    public set throttleTimer(value) {
        this._throttleTimer = value;
    }
}