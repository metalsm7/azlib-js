"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
String.random = (length = 6, base_str = null) => {
    base_str === null && (base_str = 'qaAZWKOLPDbyholpm567fukdcrEQFV3489vBYHNjMIUJtgSzwsTG12iXCRxen0');
    const base_str_cnt = base_str.length;
    let rtn_val = '';
    while (rtn_val.length < length) {
        rtn_val += base_str.charAt(Math.floor(Math.random() * base_str_cnt));
    }
    return rtn_val;
};
