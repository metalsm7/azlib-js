import './prototypes';
import { AZData } from './azdata';
export declare class AZList {
    private _map_attribute;
    private _list;
    constructor();
    getAttribute(key: string): any;
    putAttribute(key: string, value: any): any;
    removeAttribute(key: string): any;
    clearAttribute(): number;
    add(data: AZData): AZList;
    set(index: number, data: AZData): AZList;
    remove(index: number, _cb?: Function | null): AZList;
    clear(): AZList;
    get(index: number): AZData | null;
    size(): number;
    toString(_json?: boolean): string;
    toJsonString(): string;
}
