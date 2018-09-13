export function isNotInstalledError(error: Error): boolean {
    const isError = typeof(error) === 'object' && error != null;
    const errorObj = <any>error;
    if (!isError) {
        return false;
    }
    const isModuleNotInstalledError = error.message.indexOf('No module named') >= 0;
    return errorObj.code === 'ENOENT' || errorObj.code === 127 || isModuleNotInstalledError;
}

export interface Deferred<T> {
    readonly promise: Promise<T>;
    readonly resolved: boolean;
    readonly rejected: boolean;
    readonly completed: boolean;

    resolve(value?: T | PromiseLike<T>);

    reject(reason?: any);
}

class DeferredImpl<T> implements Deferred<T> {
    private _resolve!: (value?: T | PromiseLike<T>) => void;
    private _reject!: (reason?: any) => void;
    private _resolved: boolean = false;
    private _rejected: boolean = false;
    private _promise: Promise<T>;

    constructor(private _scope: any = null) {
        this._promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    public get promise(): Promise<T> {
        return this._promise;
    }

    public get resolved(): boolean {
         return this._resolved;
    }

    public get rejected(): boolean {
        return this._rejected;
    }

    public get completed(): boolean {
        return this._resolved || this._rejected;
    }

    public resolve(value?: T | PromiseLike<T>) {
        this._resolve.apply(this._scope ? this._scope : this, arguments);
        this._resolved = true;
    }

    public reject(reason?: any) {
        this._reject.apply(this._scope ? this._scope : this, arguments);
        this._rejected = true;
    }
}

export function createDeferred<T>(scope: any = null): Deferred<T> {
    return new DeferredImpl<T>(scope);
}