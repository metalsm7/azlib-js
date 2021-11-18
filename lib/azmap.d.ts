export declare class AZMap {
    private _map;
    constructor();
    exists(key: string): boolean;
    put(key: string, value: any): any;
    get(key: string): any;
    remove(key: string): any;
    clear(): void;
    size(): number;
}
