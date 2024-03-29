"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringBuilder = void 0;
class StringBuilder {
    constructor() {
        this.values = [];
    }
    /**
     * @param {String|number} str
     */
    append(str) {
        this.values.push(str);
    }
    clear() {
        this.values.splice(0);
    }
    /**
     * @returns {string}
     */
    toString() {
        return this.values.join('');
    }
}
exports.StringBuilder = StringBuilder;
