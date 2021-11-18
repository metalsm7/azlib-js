"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZMap = void 0;
class AZMap {
    constructor() {
        this._map = {};
    }
    exists(key) {
        return typeof this._map[key] !== 'undefined';
    }
    put(key, value) {
        this._map[key] = value;
        return value;
    }
    get(key) {
        let rtn_val = null;
        this.exists(key) && (rtn_val = this._map[key]);
        return rtn_val;
    }
    remove(key) {
        let rtn_val = null;
        this.exists(key) && ((rtn_val = this.get(key)) || delete this._map[key]);
        return rtn_val;
    }
    clear() {
        this._map = {};
    }
    size() {
        return Object.keys(this._map).length;
    }
}
exports.AZMap = AZMap;
