declare global {
    interface StringConstructor {
        random(): string;
        random(length: number): string;
        random(length: number, base_str: string): string;
    }
}
export {};
