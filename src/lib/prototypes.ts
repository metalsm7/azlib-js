declare global {
    interface StringConstructor  {
        random(): string;
        random(length: number): string;
        random(length: number, base_str: string): string;
    }
}

String.random = (length: number = 6, base_str: string|null = null): string => {
    base_str === null && (base_str = 'qaAZWKOLPDbyholpm567fukdcrEQFV3489vBYHNjMIUJtgSzwsTG12iXCRxen0');
    const base_str_cnt = base_str.length;
    let rtn_val = '';
    while (rtn_val.length < length) {
        rtn_val += base_str.charAt(Math.floor(Math.random() * base_str_cnt));
    }
    return rtn_val;
};

export {};