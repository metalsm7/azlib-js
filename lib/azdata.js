"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZData = void 0;
require("./prototypes");
const azmap_1 = require("./azmap");
const azlist_1 = require("./azlist");
class AZData {
    constructor() {
        this._map_async = new azmap_1.AZMap();
        // this._map_attribute = new AZMap();
        this._attribute = new AZData.AttributeData();
        this._indexer = new Array();
    }
    // getAttribute(key: string): any {
    //     return this._map_attribute.get(key);
    // }
    // putAttribute(key: string, value: any): any {
    //     return this._map_attribute.put(key, value);
    // }
    // removeAttribute(key: string): any {
    //     return this._map_attribute.remove(key);
    // }
    // clearAttribute(): number {
    //     const rtn_val = this._map_attribute.size();
    //     this._map_attribute.clear();
    //     return rtn_val;
    // }
    existsLinkKey(link_key) {
        let rtn_val = false;
        for (let cnti = 0; cnti < this._indexer.length; cnti++) {
            const link = this._indexer[cnti];
            rtn_val = link_key === link.getLink();
            if (rtn_val)
                break;
        }
        // Promise
        //     .all(this._indexer.map((el: AZData.KeyLink) => {
        //         rtn_val = link_key === el.getLink();
        //     }))
        return rtn_val;
    }
    indexOf(key) {
        let rtn_val = -1;
        for (let cnti = 0; cnti < this._indexer.length; cnti++) {
            const link = this._indexer[cnti];
            if (link.getLink() === key) {
                rtn_val = cnti;
                break;
            }
        }
        return rtn_val;
    }
    add(key, value = null, _cb = null) {
        if (key instanceof AZData) {
            let key_links = null;
            _cb && (key_links = new Array());
            for (let cnti = 0; cnti < key.size(); cnti++) {
                const _key = key.getKey(cnti);
                const _val = key.get(cnti);
                //
                this.add(_key, _val, (link) => {
                    key_links && key_links.push(link);
                });
            }
            _cb && _cb(key_links);
        }
        else {
            let link_key = key;
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
        }
        return this;
    }
    set(key, value) {
        if (typeof key === 'string') {
            if (!this._map_async.exists(key)) {
                return this.add(key, value);
            }
            this._map_async.put(key, value);
        }
        else {
            if (key < 0 || key > this._indexer.length - 1)
                throw new Error('index out of bounds');
            this._map_async.put(this._indexer[key].getLink(), value);
        }
        return this;
    }
    remove(key, _cb = null) {
        const idx = typeof key === 'string' ? this.indexOf(key) : key;
        if (idx > -1) {
            const link = this._indexer[idx];
            this._map_async.remove(link.getLink());
            this._indexer.splice(idx, 1);
            _cb && _cb(link);
        }
        else {
            _cb && _cb();
        }
        return this;
    }
    clear() {
        this._map_async = new azmap_1.AZMap();
        // this._map_attribute = new AZMap();
        this._indexer = new Array();
        return this;
    }
    // get(key: string): any;
    // get(index: number): any;
    get(key_or_index) {
        switch (typeof (key_or_index)) {
            case 'number':
                return this._map_async.get(this._indexer[key_or_index].getLink());
            default:
                if (key_or_index instanceof AZData.KeyLink) {
                    return this._map_async.get(key_or_index.getLink());
                }
                return this._map_async.get(key_or_index);
        }
    }
    getString(key_or_index) {
        let rtn_val = this.get(key_or_index);
        return String(rtn_val);
    }
    getNumber(key_or_index, _default = 0) {
        let rtn_val = this.get(key_or_index);
        if (isNaN(rtn_val))
            rtn_val = _default;
        return Number(rtn_val);
    }
    getKey(index) {
        return this._indexer[index].getKey();
    }
    getLink(index) {
        return this._indexer[index].getLink();
    }
    size() {
        return this._indexer.length;
    }
    toString(_json = false) {
        let rtn_val = '';
        for (let cnti = 0; cnti < this._indexer.length; cnti++) {
            // const link: AZData.KeyLink = this._indexer[cnti];
            cnti > 0 && (rtn_val += ', ');
            rtn_val += `"${this.getKey(cnti)}":`; // ${this.get(cnti)}`;
            const value = this.get(cnti);
            switch (typeof value) {
                case 'number':
                    rtn_val += value;
                    break;
                default:
                    if (value instanceof AZData) {
                        rtn_val += value.toString(_json);
                    }
                    else if (value instanceof azlist_1.AZList) {
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
    toJsonString() {
        return this.toString(true);
    }
    get attribute() {
        return this._attribute;
    }
}
exports.AZData = AZData;
(function (AZData) {
    class KeyLink {
        constructor(key, link) {
            this._key = key;
            this._link = link;
        }
        getKey() {
            return this._key;
        }
        getLink() {
            return this._link;
        }
        toString() {
            return `${this._key}:${this._link}`;
        }
    }
    AZData.KeyLink = KeyLink;
    class KeyValue {
        constructor(key, value) {
            this._key = key;
            this._value = value;
        }
        getKey() {
            return this._key;
        }
        getValue() {
            return this._value;
        }
        toString() {
            return `${this._key}:${this._value}`;
        }
    }
    class AttributeData {
        constructor() {
            this._list = new Array();
        }
        add(key, value) {
            this._list.push(new KeyValue(key, value));
            return value;
        }
        get(key) {
            let rtn_val = null;
            if (typeof key === 'string') {
                for (let cnti = 0; cnti < this._list.length; cnti++) {
                    const data = this._list[cnti];
                    if (data.getKey() === key) {
                        rtn_val = data.getValue();
                        break;
                    }
                }
            }
            else {
                if (key > -1 && key < this._list.length) {
                    rtn_val = this._list[key].getValue();
                }
            }
            return rtn_val;
        }
    }
    AZData.AttributeData = AttributeData;
})(AZData = exports.AZData || (exports.AZData = {}));
