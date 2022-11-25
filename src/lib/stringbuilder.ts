export class StringBuilder {
    values: string[] = [];

    /**
     * @param {String|number} str
     */
    append(str: string) {
        this.values.push(str);
    }

    clear() {
        this.values.splice(0);
    }

    /**
     * @returns {string}
     */
    toString(): string {
        return this.values.join('');
    }
}