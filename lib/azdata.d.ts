import './prototypes';
export declare class AZData {
    private _map_async;
    private _map_attribute;
    private _indexer;
    constructor();
    getAttribute(key: string): any;
    putAttribute(key: string, value: any): any;
    removeAttribute(key: string): any;
    clearAttribute(): number;
    private existsLinkKey;
    indexOf(key: string): number;
    add(key: string, value: any, _cb?: Function | null): AZData;
    set(key: string, value: any): AZData;
    remove(key: string | number, _cb?: Function | null): AZData;
    clear(): AZData;
    get(key_or_index: string | number | AZData.KeyLink): any;
    getString(key_or_index: string | number): string;
    getNumber(key_or_index: string | number, _default?: number): number;
    getKey(index: number): string;
    getLink(index: number): string;
    size(): number;
    toString(_json?: boolean): string;
    toJsonString(): string;
}
export declare namespace AZData {
    class KeyLink {
        private _key;
        private _link;
        constructor(key: string, link: string);
        getKey(): string;
        getLink(): string;
        toString(): string;
    }
}
