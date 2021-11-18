import './prototypes';
import { AZMap } from './azmap';
import { AZData } from './azdata';

export class AZList {
    private _map_attribute: AZMap;
    private _list: Array<AZData>;

    constructor() {
        this._map_attribute = new AZMap();
        this._list = new Array<AZData>();
    }

    getAttribute(key: string): any {
        return this._map_attribute.get(key);
    }

    putAttribute(key: string, value: any): any {
        return this._map_attribute.put(key, value);
    }

    removeAttribute(key: string): any {
        return this._map_attribute.remove(key);
    }

    clearAttribute(): number {
        const rtn_val = this._map_attribute.size();
        this._map_attribute.clear();
        return rtn_val;
    }

    add(data: AZData): AZList {
        this._list.push(data);
        return this;
    }

    set(index: number, data: AZData): AZList {
        if (index < 0 || index >= this.size()) return this;
        this._list[index] = data;
        return this;
    }

    remove(index: number, _cb: Function|null = null): AZList {
        if (index < 0 || index >= this.size()) return this;
        this._list.splice(index, 1);
        return this;
    }

    clear(): AZList {
        // this._map_attribute = new AZMap();
        this._list = new Array<AZData>();
        return this;
    }

    get(index: number): AZData|null {
        if (index < 0 || index >= this.size()) return null;
        return this._list[index];
    }

    size(): number {
        return this._list.length;
    }

    toString(_json: boolean = false): string {
        let rtn_val = '';
        for (let cnti: number = 0; cnti < this.size(); cnti++) {
            const data: AZData = this._list[cnti];
            cnti > 0 && (rtn_val += ', ');
            rtn_val += data.toString(_json);
        }
        return _json ? `[${rtn_val}]` : rtn_val;
    }

    toJsonString(): string {
        return this.toString(true);
    }
}