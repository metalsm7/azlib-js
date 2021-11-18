"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZList = void 0;
require("./prototypes");
const azmap_1 = require("./azmap");
class AZList {
    constructor() {
        this._map_attribute = new azmap_1.AZMap();
        this._list = new Array();
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
    add(data) {
        this._list.push(data);
        return this;
    }
    set(index, data) {
        if (index < 0 || index >= this.size())
            return this;
        this._list[index] = data;
        return this;
    }
    remove(index, _cb = null) {
        if (index < 0 || index >= this.size())
            return this;
        this._list.splice(index, 1);
        return this;
    }
    clear() {
        // this._map_attribute = new AZMap();
        this._list = new Array();
        return this;
    }
    get(index) {
        if (index < 0 || index >= this.size())
            return null;
        return this._list[index];
    }
    size() {
        return this._list.length;
    }
    toString(_json = false) {
        let rtn_val = '';
        for (let cnti = 0; cnti < this.size(); cnti++) {
            const data = this._list[cnti];
            cnti > 0 && (rtn_val += ', ');
            rtn_val += data.toString(_json);
        }
        return _json ? `[${rtn_val}]` : rtn_val;
    }
    toJsonString() {
        return this.toString(true);
    }
}
exports.AZList = AZList;
