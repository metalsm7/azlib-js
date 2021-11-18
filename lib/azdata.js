"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZData = void 0;
require("./prototypes");
const azmap_1 = require("./azmap");
const azlist_1 = require("./azlist");
class AZData {
    constructor() {
        this._map_async = new azmap_1.AZMap();
        this._map_attribute = new azmap_1.AZMap();
        this._indexer = new Array();
    }
    getAttribute(key) {
        return this._map_attribute.get(key);
    }
    putAttribute(key, value) {
        return this._map_attribute.put(key, value);
    }
    removeAttribute(key) {
        return this._map_attribute.remove(key);
    }
    clearAttribute() {
        const rtn_val = this._map_attribute.size();
        this._map_attribute.clear();
        return rtn_val;
    }
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
    add(key, value, _cb = null) {
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
        return this;
    }
    set(key, value) {
        if (!this._map_async.exists(key)) {
            return this.add(key, value);
        }
        this._map_async.put(key, value);
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
})(AZData = exports.AZData || (exports.AZData = {}));
