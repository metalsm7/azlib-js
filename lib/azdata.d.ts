import './prototypes';
export declare class AZData {
    private _map_async;
    private _attribute;
    private _indexer;
    constructor();
    private existsLinkKey;
    hasKey(key: string): boolean;
    indexOf(key: string): number;
    add(key: string | AZData, value?: any, _cb?: Function | null): AZData;
    set(key: string | number, value: any): AZData;
    remove(key: string | number, _cb?: Function | null): AZData;
    clear(): AZData;
    get(key_or_index: string | number | AZData.KeyLink): any;
    getString(key_or_index: string | number): string;
    getNumber(key_or_index: string | number, _default?: number): number;
    getKey(index: number): string;
    getLink(index: number): string;
    size(): number;
    getKeys(): Array<string>;
    toString(_json?: boolean): string;
    toJsonString(): string;
    get attribute(): AZData.AttributeData;
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
    class AttributeData {
        private _list;
        constructor();
        add(key: string, value: any): any;
        get(key: string | number): any;
        toString(): string;
    }
}
