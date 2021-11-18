export class AZMap {
    private _map: any;
    constructor() {
        this._map = {};
    }

    exists(key: string): boolean {
        return typeof this._map[key] !== 'undefined';
    }

    put(key: string, value: any): any {
        this._map[key] = value;
        return value;
    }

    get(key: string): any {
        let rtn_val = null;
        this.exists(key) && (rtn_val = this._map[key]);
        return rtn_val;
    }

    remove(key: string): any {
        let rtn_val = null;
        this.exists(key) && ((rtn_val = this.get(key)) || delete this._map[key]);
        return rtn_val;
    }

    clear(): void {
        this._map = {};
    }

    size(): number {
        return Object.keys(this._map).length;
    }
}
