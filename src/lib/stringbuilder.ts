export class StringBuilder {
    values: string[] = [];

    /**
     * @param {String|number} str
     */
    append(str: string) {
        this.values.push(str);
    }

    /**
     * @returns {string}
     */
    toString(): string {
        return this.values.join('');
    }
}