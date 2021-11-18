import './prototypes';
import { AZMap } from './azmap';
import { AZList } from './azlist';

export class AZData {
    private _map_async: AZMap;
    private _map_attribute: AZMap;
    private _indexer: Array<AZData.KeyLink>;

    constructor() {
        this._map_async = new AZMap();
        this._map_attribute = new AZMap();
        this._indexer = new Array<AZData.KeyLink>();
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

    private existsLinkKey(link_key: string): boolean {
        let rtn_val = false;
        for (let cnti: number = 0; cnti < this._indexer.length; cnti++) {
            const link: AZData.KeyLink = this._indexer[cnti];
            rtn_val = link_key === link.getLink();
            if (rtn_val) break;
        }
        // Promise
        //     .all(this._indexer.map((el: AZData.KeyLink) => {
        //         rtn_val = link_key === el.getLink();
        //     }))
        return rtn_val;
    }

    indexOf(key: string): number {
        let rtn_val = -1;
        for (let cnti: number = 0; cnti < this._indexer.length; cnti++) {
            const link: AZData.KeyLink = this._indexer[cnti];
            if (link.getLink() === key) {
                rtn_val = cnti;
                break;
            }
        }
        return rtn_val;
    }

    add(key: string, value: any, _cb: Function|null = null): AZData {
        let link_key: string = key;
        if (this._map_async.exists(key)) {
            link_key = `${key}/${String.random()}`;
            while (this.existsLinkKey(link_key)) {
                link_key = `${key}/${String.random()}`;
            }
        }
        const key_link = new AZData.KeyLink(key, link_key);
        this._map_async.put(link_key, value);
        this._indexer.push(key_link);
        _cb && _cb(key_link);
        return this;
    }

    set(key: string, value: any): AZData {
        if (!this._map_async.exists(key)) {
            return this.add(key, value);
        }
        this._map_async.put(key, value);
        return this;
    }

    remove(key: string|number, _cb: Function|null = null): AZData {
        const idx: number = typeof key === 'string' ? this.indexOf(key) : key;
        if (idx > -1) {
            const link: AZData.KeyLink = this._indexer[idx];
            this._map_async.remove(link.getLink());
            this._indexer.splice(idx, 1);
            _cb && _cb(link);
        }
        else {
            _cb && _cb();
        }
        return this;
    }

    clear(): AZData {
        this._map_async = new AZMap();
        // this._map_attribute = new AZMap();
        this._indexer = new Array<AZData.KeyLink>();
        return this;
    }

    // get(key: string): any;
    // get(index: number): any;
    get(key_or_index: string|number|AZData.KeyLink): any {
        switch (typeof(key_or_index)) {
            case 'number':
                return this._map_async.get(this._indexer[key_or_index].getLink());
            default:
                if (key_or_index instanceof AZData.KeyLink) {
                    return this._map_async.get((key_or_index as AZData.KeyLink).getLink());
                }
                return this._map_async.get(key_or_index);
        }
    }

    getString(key_or_index: string|number): string {
        let rtn_val: any = this.get(key_or_index);
        return String(rtn_val);
    }

    getNumber(key_or_index: string|number, _default: number = 0): number {
        let rtn_val: any = this.get(key_or_index);
        if (isNaN(rtn_val)) rtn_val = _default;
        return Number(rtn_val);
    }

    getKey(index: number): string {
        return this._indexer[index].getKey();
    }

    getLink(index: number): string {
        return this._indexer[index].getLink();
    }

    size(): number {
        return this._indexer.length;
    }

    toString(_json: boolean = false): string {
        let rtn_val = '';
        for (let cnti: number = 0; cnti < this._indexer.length; cnti++) {
            // const link: AZData.KeyLink = this._indexer[cnti];
            cnti > 0 && (rtn_val += ', ');
            rtn_val += `"${this.getKey(cnti)}":`; // ${this.get(cnti)}`;
            const value: any = this.get(cnti);
            switch (typeof value) {
                case 'number':
                    rtn_val += value;
                    break;
                default:
                    if (value instanceof AZData) {
                        rtn_val += (value as AZData).toString(_json);
                    }
                    else if (value instanceof AZList) {
                        // rtn_val += (value as AZList).toString(_json);
                    }
                    else {
                        rtn_val += `"${String(value)}"`;
                    }
                    break;
            }
        }
        return _json ? `{${rtn_val}}` : rtn_val;
    }

    toJsonString(): string {
        return this.toString(true);
    }
}

export namespace AZData {
    export class KeyLink {
        private _key: string;
        private _link: string;

        constructor(key: string, link: string) {
            this._key = key;
            this._link = link;
        }

        getKey(): string {
            return this._key;
        }

        getLink(): string {
            return this._link;
        }

        toString(): string {
            return `${this._key}:${this._link}`;
        }
    }
}
