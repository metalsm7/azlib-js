"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZSql = void 0;
const os_1 = require("os");
const mysql = __importStar(require("mysql2/promise"));
const azdata_1 = require("./azdata");
const azlist_1 = require("./azlist");
const stringbuilder_1 = require("./stringbuilder");
class AZSql {
    constructor() {
        this._option = null;
        this._connected = false;
        this._query = null;
        this._parameters = null;
        this._return_parameters = null;
        this._identity = false;
        this._in_transaction = false;
        this._transaction_result = null;
        this._is_stored_procedure = false;
        this._sql_connection = null;
    }
    setQuery(query) {
        this._query = query;
        return this;
    }
    getQuery() {
        return this._query;
    }
    clearQuery() {
        this._query = '';
        return this;
    }
    setParameters(parameters) {
        if (this._parameters === null) {
            this._parameters = new azdata_1.AZData();
        }
        else {
            this._parameters.clear();
        }
        this._parameters = parameters;
        return this;
    }
    getParamters() {
        return this._parameters;
    }
    getParamter(key) {
        var _a;
        return (_a = this._parameters) === null || _a === void 0 ? void 0 : _a.get(key);
    }
    addParameter(key, value) {
        var _a;
        (_a = this._parameters) === null || _a === void 0 ? void 0 : _a.add(key, value);
        return this;
    }
    addParamters(paramters) {
        var _a;
        (_a = this._parameters) === null || _a === void 0 ? void 0 : _a.add(paramters);
        return this;
    }
    clearParameters() {
        var _a;
        (_a = this._parameters) === null || _a === void 0 ? void 0 : _a.clear();
        return this;
    }
    removeParamters() {
        this._parameters = null;
        return this;
    }
    setRetuenParameters(parameters) {
        if (this._return_parameters === null) {
            this._return_parameters = new azdata_1.AZData();
        }
        else {
            this._return_parameters.clear();
        }
        this._return_parameters = parameters;
        return this;
    }
    getRetuenParamters() {
        return this._return_parameters;
    }
    getRetuenParamter(key) {
        var _a;
        return (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.get(key);
    }
    addRetuenParameter(key, value) {
        var _a;
        (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.add(key, value);
        return this;
    }
    addRetuenParamters(paramters) {
        var _a;
        (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.add(paramters);
        return this;
    }
    updateReturnParamter(key, value) {
        var _a;
        (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.set(key, value);
        return this;
    }
    clearRetuenParameters() {
        var _a;
        (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.clear();
        return this;
    }
    removeRetuenParamters() {
        this._return_parameters = null;
        return this;
    }
    setIdentity(identity) {
        this._identity = identity;
        return this;
    }
    getIdentity() {
        return this._identity;
    }
    setIsStoredProcedure(is_stored_procedure) {
        this._is_stored_procedure = is_stored_procedure;
        return this;
    }
    getIsStoredProcedure() {
        return this._is_stored_procedure;
    }
    async openAsync() {
        var _a;
        switch ((_a = this._option) === null || _a === void 0 ? void 0 : _a.sql_type) {
            case AZSql.SQL_TYPE.MYSQL:
                this._sql_connection = await new mysql.createConnection(``);
                break;
        }
    }
}
exports.AZSql = AZSql;
(function (AZSql) {
    AZSql.SQL_TYPE = {
        MYSQL: 'MYSQL',
        SQLITE: 'SQLITE',
        SQLITE_ANDROID: 'SQLITE_ANDROID',
        MSSQL: 'MSSQL',
        MARIADB: 'MARIADB',
        ORACLE: 'ORACLE'
    };
    AZSql._ATTRIBUTE_COLUMN = {
        LABEL: 'attribute_column_label',
        NAME: 'attribute_column_name',
        TYPE: 'attribute_column_type',
        TYPE_NAME: 'attribute_column_type_name',
        SCHEMA_NAME: 'attribute_column_schema_name',
        DISPLAY_SIZE: 'attribute_column_display_size',
        SCALE: 'attribute_column_scale',
        PRECISION: 'attribute_column_precision',
        AUTO_INCREMENT: 'attribute_column_auto_increment',
        CASE_SENSITIVE: 'attribute_column_case_sensitive',
        IS_NULLABLE: 'attribute_column_is_nullable',
        IS_READONLY: 'attribute_column_is_readonly',
        IS_WRITABLE: 'attribute_column_is_writable',
        IS_SIGNED: 'attribute_column_is_signed'
    };
    class BQuery {
        constructor(table_name, prepared = false) {
            this._table_name = null;
            this._prepared = false;
            typeof table_name !== 'undefined' && (this._table_name = table_name);
            this._prepared = prepared;
            this._sql_set = new azlist_1.AZList();
        }
        isPrepared() {
            return this._prepared;
        }
        setIsPrepared(prepared) {
            this._prepared = prepared;
            return this;
        }
        set(column, value, value_type) {
            if (column instanceof AZSql.BQuery.SetData) {
                return this.set(String(column.column), column.value, column.value_type);
            }
            else {
                const data = new azdata_1.AZData();
                data.attribute.add(BQuery.ATTRIBUTE.VALUE, value_type);
                data.add(column, value);
                this._sql_set.add(data);
            }
            return this;
        }
        createQuery(query_type) {
            const rtn_val = new stringbuilder_1.StringBuilder();
            switch (query_type) {
                case BQuery.CREATE_QUERY_TYPE.SELECT:
                    break;
                case BQuery.CREATE_QUERY_TYPE.INSERT:
                    break;
                case BQuery.CREATE_QUERY_TYPE.UPDATE:
                    rtn_val.append(`UPDATE ${this._table_name}${os_1.EOL}`);
                    rtn_val.append(`SET${os_1.EOL}`);
                    for (let cnti = 0; cnti < this._sql_set.size(); cnti++) {
                        const data = this._sql_set.get(cnti);
                        if (data !== null) {
                            cnti > 0 && rtn_val.append(',');
                            if (data.attribute.get(BQuery.ATTRIBUTE.VALUE) === BQuery.VALUETYPE.QUERY) {
                                rtn_val.append(` ${data.getKey(0)}=${data.getString(0)}${os_1.EOL}`);
                            }
                            else {
                                if (this.isPrepared()) {
                                    rtn_val.append(` ${data.getKey(0)}=@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}${os_1.EOL}`);
                                }
                                else {
                                    rtn_val.append(` ${data.getKey(0)}=@${data.getString(0)}${os_1.EOL}`);
                                }
                            }
                        }
                    }
                    break;
                case BQuery.CREATE_QUERY_TYPE.DELETE:
                    break;
            }
            return rtn_val.toString();
        }
    }
    AZSql.BQuery = BQuery;
    (function (BQuery) {
        let WHERETYPE;
        (function (WHERETYPE) {
            WHERETYPE["GREATER_THAN"] = ">";
            WHERETYPE["GREATER_THAN_OR_EQUAL"] = ">=";
            WHERETYPE["GT"] = ">";
            WHERETYPE["GTE"] = ">=";
            WHERETYPE["LESS_THAN"] = "<";
            WHERETYPE["LESS_THAN_OR_EQUAL"] = "<=";
            WHERETYPE["LT"] = "<";
            WHERETYPE["LTE"] = "<=";
            WHERETYPE["EQUAL"] = "=";
            WHERETYPE["NOT_EQUAL"] = "<>";
            WHERETYPE["EQ"] = "=";
            WHERETYPE["NE"] = "<>";
            WHERETYPE["BETWEEN"] = "BETWEEN";
            WHERETYPE["IN"] = "IN";
            WHERETYPE["NOT_IN"] = "NOT IN";
            WHERETYPE["NIN"] = "NOT IN";
            WHERETYPE["LIKE"] = "LIKE";
        })(WHERETYPE = BQuery.WHERETYPE || (BQuery.WHERETYPE = {}));
        ;
        let VALUETYPE;
        (function (VALUETYPE) {
            VALUETYPE["VALUE"] = "VALUE";
            VALUETYPE["QUERY"] = "QUERY";
        })(VALUETYPE = BQuery.VALUETYPE || (BQuery.VALUETYPE = {}));
        ;
        let CREATE_QUERY_TYPE;
        (function (CREATE_QUERY_TYPE) {
            CREATE_QUERY_TYPE[CREATE_QUERY_TYPE["INSERT"] = 0] = "INSERT";
            CREATE_QUERY_TYPE[CREATE_QUERY_TYPE["UPDATE"] = 1] = "UPDATE";
            CREATE_QUERY_TYPE[CREATE_QUERY_TYPE["DELETE"] = 2] = "DELETE";
            CREATE_QUERY_TYPE[CREATE_QUERY_TYPE["SELECT"] = 3] = "SELECT";
        })(CREATE_QUERY_TYPE = BQuery.CREATE_QUERY_TYPE || (BQuery.CREATE_QUERY_TYPE = {}));
        ;
        BQuery.ATTRIBUTE = {
            VALUE: 'value',
            WHERE: 'where',
        };
        class SetData {
            constructor(column, value, value_type) {
                this._column = null;
                this._value = null;
                this._value_type = BQuery.VALUETYPE.VALUE;
                typeof column !== 'undefined' && (this._column = column);
                typeof value !== 'undefined' && (this._value = value);
                typeof value_type !== 'undefined' && (this._value_type = value_type);
            }
            static init() {
                return new SetData();
            }
            set(column, value, value_type) {
                this._column = column;
                this._value = value;
                typeof value_type !== 'undefined' && (this._value_type = value_type);
            }
            getQuery() {
                let rtn_val = '';
                switch (this.value_type) {
                    case BQuery.VALUETYPE.VALUE:
                        if (typeof this.value === 'number') {
                            rtn_val = `${this.column} = ${this.value}`;
                        }
                        else {
                            rtn_val = `${this.column} = '${this.value}'`;
                        }
                        break;
                    case BQuery.VALUETYPE.QUERY:
                        rtn_val = `${this.column} = ${this.value}`;
                        break;
                }
                return rtn_val;
            }
            get column() {
                return this._column;
            }
            set column(column) {
                this._column = column;
            }
            get value() {
                return this._value;
            }
            set value(value) {
                this._value = value;
            }
            get value_type() {
                return this._value_type;
            }
            set value_type(value_type) {
                this._value_type = value_type;
            }
        }
        BQuery.SetData = SetData;
        class Condition {
            constructor(column, value, where_type, value_type) {
                this._column = null;
                this._where_type = BQuery.WHERETYPE.EQUAL;
                this._value_type = BQuery.VALUETYPE.VALUE;
                this._prepared = false;
                typeof column !== 'undefined' && typeof value !== 'undefined' &&
                    this.set(column, value, where_type, value_type);
            }
            set(column, value, where_type, value_type) {
                this._column = column;
                this._value = value;
                typeof where_type !== 'undefined' && (this._where_type = where_type);
                typeof value_type !== 'undefined' && (this._value_type = value_type);
            }
            setPrepared(prepare) {
                this._prepared = prepare;
                return this;
            }
            isPrepared() {
                return this._prepared;
            }
            toAZData(index, _cb = null) {
                var _a, _b, _c, _d, _e, _f, _g;
                ++index;
                const rtn_val = new azdata_1.AZData();
                if (!this.isPrepared())
                    return rtn_val;
                switch (this._value_type) {
                    case BQuery.VALUETYPE.VALUE:
                        switch (this._where_type) {
                            case BQuery.WHERETYPE.BETWEEN:
                                if (Array.isArray(this._value)) {
                                    rtn_val.add(`@${(_a = this._column) === null || _a === void 0 ? void 0 : _a.replace('.', '___')}_where_${index}_between_1`, this._value.length > 0 ?
                                        this._value[0] :
                                        null);
                                    rtn_val.add(`@${(_b = this._column) === null || _b === void 0 ? void 0 : _b.replace('.', '___')}_where_${index}_between_2`, this._value.length > 1 ?
                                        this._value[1] :
                                        null);
                                }
                                else {
                                    rtn_val.add(`@${(_c = this._column) === null || _c === void 0 ? void 0 : _c.replace('.', '___')}_where_${index}_between_1`, this._value);
                                    rtn_val.add(`@${(_d = this._column) === null || _d === void 0 ? void 0 : _d.replace('.', '___')}_where_${index}_between_2`, this._value);
                                }
                                break;
                            case BQuery.WHERETYPE.IN:
                            case BQuery.WHERETYPE.NIN:
                            case BQuery.WHERETYPE.NOT_IN:
                                if (Array.isArray(this._value)) {
                                    for (let cnti = 0; cnti < this._value.length; cnti++) {
                                        const data = this._value[cnti];
                                        rtn_val.add(`@${(_e = this._column) === null || _e === void 0 ? void 0 : _e.replace('.', '___')}_where_${index}_in_${cnti + 1}`, this._value);
                                    }
                                }
                                else {
                                    rtn_val.add(`@${(_f = this._column) === null || _f === void 0 ? void 0 : _f.replace('.', '___')}_where_${index}_in_1`, this._value);
                                }
                                break;
                            default:
                                rtn_val.add(`@${(_g = this._column) === null || _g === void 0 ? void 0 : _g.replace('.', '___')}_where_${++index}`, this._value);
                                break;
                        }
                        break;
                }
                _cb && _cb(index);
                return rtn_val;
            }
            toString(index, _cb = null) {
                var _a, _b, _c, _d, _e, _f;
                ++index;
                const rtn_val = new stringbuilder_1.StringBuilder();
                switch (this._value_type) {
                    case BQuery.VALUETYPE.QUERY:
                        switch (this._where_type) {
                            case BQuery.WHERETYPE.BETWEEN:
                                if (Array.isArray(this._value)) {
                                    const val1 = this._value.length > 0 ? this._value[0] : null;
                                    const val2 = this._value.length > 1 ? this._value[1] : null;
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} ${val1} AND ${val2}`);
                                }
                                else {
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} ${this._value} AND ${this._value}`);
                                }
                                break;
                            case BQuery.WHERETYPE.IN:
                            case BQuery.WHERETYPE.NIN:
                            case BQuery.WHERETYPE.NOT_IN:
                                if (Array.isArray(this._value)) {
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${this._value.join(',')})`);
                                }
                                else {
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${this._value})`);
                                }
                                break;
                            default:
                                rtn_val.append(`${this._column} ${this._where_type.valueOf()} ${this._value}`);
                                break;
                        }
                        break;
                    case BQuery.VALUETYPE.VALUE:
                        switch (this._where_type) {
                            case BQuery.WHERETYPE.BETWEEN:
                                if (Array.isArray(this._value)) {
                                    let val1 = null;
                                    let val2 = null;
                                    if (this._prepared) {
                                        val1 = `@${(_a = this._column) === null || _a === void 0 ? void 0 : _a.replace('.', '___')}_where_${index}_between_1`;
                                        val2 = `@${(_b = this._column) === null || _b === void 0 ? void 0 : _b.replace('.', '___')}_where_${index}_between_2`;
                                    }
                                    else {
                                        val1 = typeof this._value === 'string' ? `'${this._value}'` : this._value;
                                        val2 = typeof this._value === 'string' ? `'${this._value}'` : this._value;
                                    }
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} ${val1} AND ${val2}`);
                                }
                                else {
                                    let val = null;
                                    if (this._prepared) {
                                        val = `@${(_c = this._column) === null || _c === void 0 ? void 0 : _c.replace('.', '___')}_where_${index}_between_1`;
                                    }
                                    else {
                                        val = typeof this._value === 'string' ? `'${this._value}'` : this._value;
                                    }
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} ${val} AND ${val}`);
                                }
                                break;
                            case BQuery.WHERETYPE.IN:
                            case BQuery.WHERETYPE.NIN:
                            case BQuery.WHERETYPE.NOT_IN:
                                if (Array.isArray(this._value)) {
                                    if (this._prepared) {
                                        const vals = new Array();
                                        for (let cnti = 0; cnti < this._value.length; cnti++) {
                                            vals.push(`@${(_d = this._column) === null || _d === void 0 ? void 0 : _d.replace('.', '___')}_where_${index}_in_${cnti + 1}`);
                                        }
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${vals.join(',')})`);
                                    }
                                    else {
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${this._value.join(',')})`);
                                    }
                                }
                                else {
                                    if (this._prepared) {
                                        const vals = new Array();
                                        vals.push(`@${(_e = this._column) === null || _e === void 0 ? void 0 : _e.replace('.', '___')}_where_${index}_in_1`);
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${vals.join(',')})`);
                                    }
                                    else {
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${this._value.join(',')})`);
                                    }
                                }
                                break;
                            default:
                                if (this._prepared) {
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} @${(_f = this._column) === null || _f === void 0 ? void 0 : _f.replace('.', '___')}_where_${index}`);
                                }
                                else {
                                    switch (typeof this._value) {
                                        case 'number':
                                        case 'boolean':
                                            rtn_val.append(`${this._column} ${this._where_type.valueOf()} ${this._value}`);
                                            break;
                                        default:
                                            rtn_val.append(`${this._column} ${this._where_type.valueOf()} '${this._value}'`);
                                            break;
                                    }
                                }
                                break;
                        }
                        break;
                }
                _cb && _cb(index);
                return rtn_val.toString();
            }
        }
        BQuery.Condition = Condition;
    })(BQuery = AZSql.BQuery || (AZSql.BQuery = {}));
})(AZSql = exports.AZSql || (exports.AZSql = {}));
