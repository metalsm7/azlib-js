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
const mysql2 = __importStar(require("mysql2/promise"));
const sqlite3 = __importStar(require("sqlite3"));
// import { AZMap } from './azmap';
const azdata_1 = require("./azdata");
const azlist_1 = require("./azlist");
const stringbuilder_1 = require("./stringbuilder");
class AZSql {
    constructor(connection_or_option) {
        this._option = {};
        this._connected = false;
        this._query = null;
        this._parameters = null;
        this._return_parameters = null;
        this._identity = false;
        this._in_transaction = false;
        this._transaction = null;
        this._transaction_result = null;
        this._transaction_on_commit = null;
        this._transaction_on_rollback = null;
        this._is_stored_procedure = false;
        this._sql_connection = null;
        this._sql_pool = null;
        this._is_prepared = false;
        // console.log(connection_or_option);
        // console.log(typeof connection_or_option);
        if (connection_or_option['sql_type'] !== undefined) {
            this._option = connection_or_option;
        }
        else {
            if (connection_or_option instanceof sqlite3.Database) {
                this._sql_connection = connection_or_option;
                this._connected = true;
                this._option.sql_type = AZSql.SQL_TYPE.SQLITE;
            }
            else {
                this._sql_connection = connection_or_option;
                this._connected = true;
                this._option.sql_type = AZSql.SQL_TYPE.MYSQL;
            }
        }
    }
    clear() {
        this.setIsStoredProcedure(false);
        // this.setIdentity(false);
        this.clearQuery();
        this.clearParameters();
        this.clearRetuenParameters();
        this.removeTran();
        return this;
    }
    setQuery(query) {
        this._query = query;
        return this;
    }
    getQuery(_preapred = false) {
        return this._query;
    }
    clearQuery() {
        this._query = '';
        return this;
    }
    setPrepared(prepared) {
        this._is_prepared = prepared;
        return this;
    }
    get isPrepared() {
        return this._is_prepared;
    }
    getPreapredQueryAndParams() {
        var _a, _b, _c;
        // console.log(`getPreparedQueryAndParams - size:${this._parameters?.size()}`);
        if (this._parameters === null)
            return [this._query, []];
        let query = this._query;
        const param = new Array();
        const keys = (_a = this._parameters) === null || _a === void 0 ? void 0 : _a.getKeys();
        const serialized_keys = keys.join('|');
        const regex = new RegExp(`([^@])(${serialized_keys})([\r\n\\s\\t,)]|$)`);
        // console.log(`getPreparedQueryAndParams - serialized_keys:${serialized_keys} - search:${query.search(regex)}`);
        while (query.search(regex) > -1) {
            const match_array = query.match(regex);
            const key = match_array && match_array.length > 2 ? match_array[2] : null;
            // console.log(`getPreparedQueryAndParams - key:${key}`);
            if (key == null)
                continue;
            const val = (_b = this._parameters) === null || _b === void 0 ? void 0 : _b.get(key);
            if (typeof val !== 'undefined' && Array.isArray(val)) {
                let q_str = ',?'.repeat(val.length);
                q_str.length > 1 && (q_str = q_str.substring(1));
                query = query.replace(regex, `$1${q_str}$3`);
                for (let cnti = 0; cnti < val.length; cnti++) {
                    param.push(val[cnti]);
                }
            }
            else {
                query = query.replace(regex, '$1?$3');
                param.push((_c = this._parameters) === null || _c === void 0 ? void 0 : _c.get(key));
            }
        }
        // for (let cnti: number = 0; cnti < this._parameters?.size(); cnti++) {
        //     const key: string = this._parameters.getKey(cnti);
        //     const value: any = this._parameters.get(cnti);
        //     const regex: RegExp = new RegExp(`([^@])(${key})([\r\n\\s\\t,)]|$)`);
        //     console.log(`getPreparedQueryAndParams - key:${key} - search:${query.search(regex)}`);
        //     while (query.search(regex) > -1) {
        //         query = query.replace(regex, '$1?$3');
        //         param.push(value);
        //     }
        // }
        // const regex: RegExp = new RegExp(`([^@])(@[a-zA-Z0-9_]+)([\r\n\\s\\t,)]|$)`);
        // while (query.search(regex) > -1) {
        //     const key: string = query.replace(regex, '$2');
        //     if (this._parameters.hasKey(key)) {
        //         param.push(this._parameters.get(key));
        //         query = query.replace(regex, '$1?$3');
        //     }
        // }
        return [query, param];
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
        var _a, _b, _c, _d, _e;
        switch ((_a = this._option) === null || _a === void 0 ? void 0 : _a.sql_type) {
            case AZSql.SQL_TYPE.MYSQL:
                this._sql_connection = await new mysql2.createConnection({
                    host: (_b = this.option) === null || _b === void 0 ? void 0 : _b.server,
                    user: (_c = this.option) === null || _c === void 0 ? void 0 : _c.id,
                    password: (_d = this.option) === null || _d === void 0 ? void 0 : _d.pw,
                    database: (_e = this.option) === null || _e === void 0 ? void 0 : _e.catalog,
                });
                break;
            case AZSql.SQL_TYPE.SQLITE:
                await new Promise((resolve, reject) => {
                    var _a;
                    this._sql_connection = new sqlite3.Database((_a = this.option) === null || _a === void 0 ? void 0 : _a.server, (_res) => {
                        if (_res === null)
                            resolve();
                        reject();
                    });
                });
                break;
        }
        return this._connected = this._sql_connection !== null;
    }
    async beginTran(_on_commit, _on_rollback) {
        var _a;
        if (this._in_transaction)
            throw new Error('Transaction in use');
        if (this._transaction !== null)
            throw new Error('Transaction exists');
        switch ((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) {
            case AZSql.SQL_TYPE.MYSQL:
                if (typeof this._sql_connection['commit'] === 'undefined') {
                    this._sql_pool = this._sql_connection;
                    this._sql_connection = await this._sql_pool.getConnection();
                }
                this._transaction = this._sql_connection.beginTransaction();
                this._transaction
                    .catch((err) => {
                    this._transaction = null;
                })
                    .then(() => {
                    this._in_transaction = true;
                    typeof _on_commit !== 'undefined' && (this._transaction_on_commit = _on_commit);
                    typeof _on_rollback !== 'undefined' && (this._transaction_on_rollback = _on_rollback);
                });
                break;
        }
    }
    async commit() {
        var _a;
        if (this._in_transaction) {
            switch ((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) {
                case AZSql.SQL_TYPE.MYSQL:
                    await this._sql_connection.commit();
                    break;
            }
            this._transaction_on_commit && this._transaction_on_commit();
        }
        this.removeTran();
    }
    async rollback() {
        var _a;
        if (!this._in_transaction)
            throw new Error('Transaction not exists');
        switch ((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) {
            case AZSql.SQL_TYPE.MYSQL:
                await this._sql_connection.rollback();
                break;
        }
        this._transaction_on_rollback && this._transaction_on_rollback();
        this.removeTran();
    }
    removeTran() {
        if (this._sql_pool !== null) {
            this._sql_connection = this._sql_pool;
            this._sql_pool = null;
        }
        this._transaction = null;
        this._in_transaction = false;
        this._transaction_on_commit = null;
        this._transaction_on_rollback = null;
        return this;
    }
    async executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp) {
        var _a;
        typeof is_sp !== 'undefined' && this.setIsStoredProcedure(is_sp);
        if (typeof return_param_or_id !== 'undefined') {
            if (return_param_or_id instanceof azdata_1.AZData) {
                this.setRetuenParameters(return_param_or_id);
            }
            else {
                this.setIdentity(return_param_or_id);
            }
        }
        if (typeof param_or_id !== 'undefined') {
            if (param_or_id instanceof azdata_1.AZData) {
                this.setParameters(param_or_id);
            }
            else {
                this.setIdentity(param_or_id);
            }
        }
        if (typeof query_or_id !== 'undefined') {
            if (typeof query_or_id === 'string') {
                this.setQuery(query_or_id);
            }
            else {
                this.setIdentity(query_or_id);
            }
        }
        if (!this.connected)
            await this.openAsync();
        const is_prepared = this.isPrepared || this.getParamters() !== null && (this.getParamters().size() > 0);
        let rtn_val = {};
        if (this.inTransaction && !this.connected)
            return Promise.reject(new Error('Not connected'));
        if (this.connected) {
            switch ((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) {
                case AZSql.SQL_TYPE.MYSQL:
                    if (is_prepared) {
                        const [query, params] = this.getPreapredQueryAndParams();
                        // console.log(`query:`);
                        // console.log(query);
                        // console.log(`params:`);
                        // console.log(params);
                        const [res, err] = await this._sql_connection.execute(query, params)
                            .then((res) => {
                            return [res, null];
                        })
                            .catch(async (err) => {
                            this.inTransaction && await this.rollback();
                            return [null, err];
                        });
                        if (err) {
                            rtn_val.err = err;
                        }
                        else {
                            // console.log(`res:`);
                            // if ((res as any)[1] !== null) throw (res as any)[1] as Error;
                            // rtn_val = this.getIdentity() ?
                            //     ((res as Array<any>)[0] as ResultSetHeader).insertId :
                            //     ((res as Array<any>)[0] as ResultSetHeader).affectedRows;
                            // console.log(`type:${(res as Array<any>)[0] instanceof Array}`);
                            if (Array.isArray(res[0])) {
                                /**
                                 * [
                                 *  rows,
                                 *  ColumnDefinitaion,
                                 * ]
                                 */
                                rtn_val.rows = res[0];
                            }
                            else {
                                /**
                                 * [
                                    ResultSetHeader {
                                        fieldCount: 0,
                                        affectedRows: 1,
                                        insertId: 4,
                                        info: '',
                                        serverStatus: 2,
                                        warningStatus: 0
                                    },
                                    undefined
                                    ]
                                 */
                                const header = res[0];
                                rtn_val.affected = header.affectedRows;
                                rtn_val.identity = header.insertId;
                                rtn_val.header = header;
                            }
                        }
                    }
                    else {
                        const [res, err] = await this._sql_connection.query(this._query)
                            .then((res) => {
                            return [res, null];
                        })
                            .catch(async (err) => {
                            this.inTransaction && await this.rollback();
                            return [null, err];
                        });
                        if (err) {
                            rtn_val.err = err;
                        }
                        else {
                            if (Array.isArray(res[0])) {
                                rtn_val.rows = res[0];
                            }
                            else {
                                const header = res[0];
                                rtn_val.affected = header.affectedRows;
                                rtn_val.identity = header.insertId;
                                rtn_val.header = header;
                            }
                        }
                    }
                    break;
                case AZSql.SQL_TYPE.SQLITE:
                    if (is_prepared) {
                        const [query, params] = this.getPreapredQueryAndParams();
                        const [res, err] = await new Promise((resolve, _reject) => {
                            const stmt = this._sql_connection.prepare(query, (_res) => {
                                if (_res === null) {
                                    if (this.getIdentity()) {
                                        stmt === null || stmt === void 0 ? void 0 : stmt.run(params, function (err) {
                                            if (err) {
                                                resolve([null, err]);
                                            }
                                            else {
                                                resolve([this, null]);
                                            }
                                        });
                                    }
                                    else {
                                        stmt === null || stmt === void 0 ? void 0 : stmt.all(params, function (err, rows) {
                                            if (err) {
                                                resolve([null, err]);
                                            }
                                            else {
                                                resolve([rows, null]);
                                            }
                                        });
                                    }
                                }
                                else {
                                    resolve([null, _res]);
                                }
                            });
                        });
                        if (err) {
                            rtn_val.err = err;
                        }
                        else {
                            if (Array.isArray(res)) {
                                rtn_val.rows = res;
                            }
                            else {
                                rtn_val.affected = res.changes;
                                rtn_val.identity = res.lastID;
                            }
                        }
                    }
                    else {
                        const [res, err] = await new Promise((resolve, _reject) => {
                            if (this.getIdentity()) {
                                this._sql_connection.run(this._query, function (err) {
                                    if (err) {
                                        resolve([null, err]);
                                    }
                                    else {
                                        resolve([this, null]);
                                    }
                                });
                            }
                            else {
                                this._sql_connection.all(this._query, (err, rows) => {
                                    if (err) {
                                        resolve([null, err]);
                                    }
                                    else {
                                        resolve([rows, null]);
                                    }
                                });
                            }
                        });
                        if (err) {
                            rtn_val.err = err;
                        }
                        else {
                            if (Array.isArray(res)) {
                                rtn_val.rows = res;
                            }
                            else {
                                rtn_val.affected = res.changes;
                                rtn_val.identity = res.lastID;
                            }
                        }
                    }
                    break;
            }
        }
        return rtn_val;
    }
    // async get(
    //     query_or_id?: string|boolean, 
    //     param_or_id?: AZData|boolean,
    //     return_param_or_id?: AZData|boolean,
    //     is_sp?: boolean
    // ): Promise<AZSql.Result> {
    //     typeof is_sp !== 'undefined' && this.setIsStoredProcedure(is_sp);
    //     if (typeof return_param_or_id !== 'undefined') {
    //         if (return_param_or_id instanceof AZData) {
    //             this.setRetuenParameters(return_param_or_id as AZData);
    //         }
    //         else {
    //             // this.setIdentity(return_param_or_id as boolean);
    //         }
    //     }
    //     if (typeof param_or_id !== 'undefined') {
    //         if (param_or_id instanceof AZData) {
    //             this.setParameters(param_or_id as AZData);
    //         }
    //         else {
    //             // this.setIdentity(param_or_id as boolean);
    //         }
    //     }
    //     if (typeof query_or_id !== 'undefined') {
    //         if (typeof query_or_id === 'string') {
    //             this.setQuery(query_or_id as string);
    //         }
    //         else {
    //             // this.setIdentity(query_or_id as boolean);
    //         }
    //     }
    // }
    get connected() {
        return this._connected;
    }
    get inTransaction() {
        return this._in_transaction;
    }
    get option() {
        return this._option;
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
    class Prepared extends AZSql {
        constructor(connection_or_option) {
            super(connection_or_option);
            this.setPrepared(true);
        }
    }
    AZSql.Prepared = Prepared;
    class BQuery {
        constructor(table_name, prepared = false) {
            this._table_name = null;
            this._prepared = false;
            typeof table_name !== 'undefined' && (this._table_name = table_name);
            this._prepared = prepared;
            this._sql_set = new azlist_1.AZList();
            this._sql_where = new Array();
        }
        isPrepared() {
            return this._prepared;
        }
        setIsPrepared(prepared) {
            this._prepared = prepared;
            return this;
        }
        clear() {
            // this._table_name = null;
            this._prepared = false;
            this.clearSet();
            this.clearWhere();
            return this;
        }
        set(column, value, value_type = BQuery.VALUETYPE.VALUE) {
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
        clearSet() {
            this._sql_set.clear();
            return this;
        }
        where(column_or_data, value, where_type, value_type) {
            if (column_or_data instanceof BQuery.Condition ||
                column_or_data instanceof BQuery.And ||
                column_or_data instanceof BQuery.Or) {
                this._sql_where.push(column_or_data);
                return this;
            }
            return this.where(new BQuery.Condition(column_or_data, value, where_type, value_type));
        }
        clearWhere() {
            this._sql_where = new Array();
            return this;
        }
        createQuery(query_type) {
            let index = 0;
            const rtn_val = new stringbuilder_1.StringBuilder();
            switch (query_type) {
                case BQuery.CREATE_QUERY_TYPE.SELECT:
                    break;
                case BQuery.CREATE_QUERY_TYPE.INSERT:
                    rtn_val.append(`INSERT INTO ${this._table_name} (${os_1.EOL}`);
                    for (let cnti = 0; cnti < this._sql_set.size(); cnti++) {
                        const data = this._sql_set.get(cnti);
                        if (data !== null) {
                            rtn_val.append(` ${data.getKey(0)}${cnti < this._sql_set.size() - 1 ? ',' : ''}${os_1.EOL}`);
                        }
                    }
                    rtn_val.append(`)${os_1.EOL}`);
                    rtn_val.append(`VALUES (${os_1.EOL}`);
                    for (let cnti = 0; cnti < this._sql_set.size(); cnti++) {
                        const data = this._sql_set.get(cnti);
                        if (data !== null) {
                            rtn_val.append(' ');
                            if (data.attribute.get(BQuery.ATTRIBUTE.VALUE) === BQuery.VALUETYPE.QUERY) {
                                rtn_val.append(`${data.get(0)}`);
                            }
                            else {
                                const val = data.get(0);
                                if (this.isPrepared()) {
                                    rtn_val.append(`@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}`);
                                    // if (val && Array.isArray(val)) {
                                    //     for (let cntk: number = 0; cntk < (val as Array<any>).length; cntk++) {
                                    //         rtn_val.append(`@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}_${cntk + 1}`);
                                    //     }
                                    // }
                                    // else {
                                    //     rtn_val.append(`@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}`);
                                    // }
                                }
                                else {
                                    if (['number', 'boolean'].indexOf(typeof val) > -1) {
                                        rtn_val.append(`${val}`);
                                    }
                                    else {
                                        rtn_val.append(`'${val}'`);
                                    }
                                }
                            }
                            cnti < (this._sql_set.size() - 1) && rtn_val.append(',');
                            rtn_val.append(`${os_1.EOL}`);
                        }
                    }
                    rtn_val.append(`)`);
                    break;
                case BQuery.CREATE_QUERY_TYPE.UPDATE:
                    rtn_val.append(`UPDATE ${this._table_name}${os_1.EOL}`);
                    this._sql_set.size() > 0 && rtn_val.append(`SET${os_1.EOL}`);
                    for (let cnti = 0; cnti < this._sql_set.size(); cnti++) {
                        const data = this._sql_set.get(cnti);
                        if (data !== null) {
                            rtn_val.append(' ');
                            if (data.attribute.get(BQuery.ATTRIBUTE.VALUE) === BQuery.VALUETYPE.QUERY) {
                                rtn_val.append(`${data.getKey(0)}=${data.getString(0)}`);
                            }
                            else {
                                if (this.isPrepared()) {
                                    rtn_val.append(`${data.getKey(0)}=@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}`);
                                }
                                else {
                                    const val = data.get(0);
                                    if (['number', 'boolean'].indexOf(typeof val) > -1) {
                                        rtn_val.append(`${data.getKey(0)}=${data.get(0)}`);
                                    }
                                    else {
                                        rtn_val.append(`${data.getKey(0)}='${data.get(0)}'`);
                                    }
                                }
                            }
                            cnti < (this._sql_set.size() - 1) && rtn_val.append(',');
                            rtn_val.append(`${os_1.EOL}`);
                        }
                    }
                    this._sql_where.length > 0 && rtn_val.append(`WHERE${os_1.EOL}`);
                    for (let cnti = 0; cnti < this._sql_where.length; cnti++) {
                        const data = this._sql_where[cnti];
                        rtn_val.append(` `);
                        cnti > 0 && rtn_val.append(`AND `);
                        if (data instanceof BQuery.And) {
                            rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, (_idx) => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Or) {
                            rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, (_idx) => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Condition) {
                            rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, (_idx) => { index = _idx; }));
                        }
                        rtn_val.append(`${os_1.EOL}`);
                    }
                    break;
                case BQuery.CREATE_QUERY_TYPE.DELETE:
                    rtn_val.append(`DELETE FROM ${this._table_name}${os_1.EOL}`);
                    this._sql_where.length > 0 && rtn_val.append(`WHERE${os_1.EOL}`);
                    for (let cnti = 0; cnti < this._sql_where.length; cnti++) {
                        const data = this._sql_where[cnti];
                        rtn_val.append(` `);
                        cnti > 0 && rtn_val.append(`AND `);
                        if (data instanceof BQuery.And) {
                            rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, (_idx) => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Or) {
                            rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, (_idx) => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Condition) {
                            rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, (_idx) => { index = _idx; }));
                        }
                        rtn_val.append(`${os_1.EOL}`);
                    }
                    break;
            }
            return rtn_val.toString();
        }
        getQuery(query_type) {
            return this.createQuery(query_type);
        }
        createPreparedParameters() {
            const rtn_val = new azdata_1.AZData();
            for (let cnti = 0; cnti < this._sql_set.size(); cnti++) {
                const data = this._sql_set.get(cnti);
                if (data !== null && data.attribute.get(BQuery.ATTRIBUTE.VALUE) === BQuery.VALUETYPE.VALUE) {
                    rtn_val.add(`@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}`, data.get(0));
                }
            }
            let index = 0;
            for (let cnti = 0; cnti < this._sql_where.length; cnti++) {
                const data = this._sql_where[cnti];
                if (data === null)
                    continue;
                if (data instanceof BQuery.And) {
                    rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, (_idx) => { index = _idx; }));
                }
                else if (data instanceof BQuery.Or) {
                    rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, (_idx) => { index = _idx; }));
                }
                else if (data instanceof BQuery.Condition) {
                    rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, (_idx) => { index = _idx; }));
                }
            }
            return rtn_val;
        }
        getPreparedParameters() {
            return this.createPreparedParameters();
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
                var _a, _b, _c, _d, _e, _f;
                ++index;
                const rtn_val = new azdata_1.AZData();
                if (!this.isPrepared())
                    return rtn_val;
                switch (this._value_type) {
                    case BQuery.VALUETYPE.VALUE:
                        switch (this._where_type) {
                            case BQuery.WHERETYPE.BETWEEN:
                                if (Array.isArray(this._value)) {
                                    rtn_val.add(`@${(_a = this._column) === null || _a === void 0 ? void 0 : _a.replace(/\./, '___')}_where_${index}_between_1`, this._value.length > 0 ?
                                        this._value[0] :
                                        null);
                                    rtn_val.add(`@${(_b = this._column) === null || _b === void 0 ? void 0 : _b.replace(/\./, '___')}_where_${index}_between_2`, this._value.length > 1 ?
                                        this._value[1] :
                                        null);
                                }
                                else {
                                    rtn_val.add(`@${(_c = this._column) === null || _c === void 0 ? void 0 : _c.replace(/\./, '___')}_where_${index}_between_1`, this._value);
                                    // rtn_val.add(`@${this._column?.replace(/\./, '___')}_where_${index}_between_2`, this._value);
                                }
                                break;
                            case BQuery.WHERETYPE.IN:
                            case BQuery.WHERETYPE.NIN:
                            case BQuery.WHERETYPE.NOT_IN:
                                if (Array.isArray(this._value)) {
                                    for (let cnti = 0; cnti < this._value.length; cnti++) {
                                        const data = this._value[cnti];
                                        rtn_val.add(`@${(_d = this._column) === null || _d === void 0 ? void 0 : _d.replace(/\./, '___')}_where_${index}_in_${cnti + 1}`, data);
                                    }
                                }
                                else {
                                    rtn_val.add(`@${(_e = this._column) === null || _e === void 0 ? void 0 : _e.replace(/\./, '___')}_where_${index}_in_1`, this._value);
                                }
                                break;
                            default:
                                rtn_val.add(`@${(_f = this._column) === null || _f === void 0 ? void 0 : _f.replace(/\./, '___')}_where_${index}`, this._value);
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
                                        val1 = `@${(_a = this._column) === null || _a === void 0 ? void 0 : _a.replace(/\./, '___')}_where_${index}_between_1`;
                                        val2 = `@${(_b = this._column) === null || _b === void 0 ? void 0 : _b.replace(/\./, '___')}_where_${index}_between_2`;
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
                                        val = `@${(_c = this._column) === null || _c === void 0 ? void 0 : _c.replace(/\./, '___')}_where_${index}_between_1`;
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
                                            vals.push(`@${(_d = this._column) === null || _d === void 0 ? void 0 : _d.replace(/\./, '___')}_where_${index}_in_${cnti + 1}`);
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
                                        vals.push(`@${(_e = this._column) === null || _e === void 0 ? void 0 : _e.replace(/\./, '___')}_where_${index}_in_1`);
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${vals.join(',')})`);
                                    }
                                    else {
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${this._value.join(',')})`);
                                    }
                                }
                                break;
                            default:
                                if (this._prepared) {
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} @${(_f = this._column) === null || _f === void 0 ? void 0 : _f.replace(/\./, '___')}_where_${index}`);
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
        class And {
            constructor(...args) {
                this._prepared = false;
                this._ands = new Array();
                this._ands.push(...args);
            }
            add(...args) {
                this._ands.push(...args);
                return this;
            }
            setPrepared(prepared) {
                this._prepared = prepared;
                return this;
            }
            isPrepared() {
                return this._prepared;
            }
            count() {
                return this._ands.length;
            }
            toAZData(index, _cb = null) {
                const rtn_val = new azdata_1.AZData();
                if (!this.isPrepared())
                    return rtn_val;
                for (let cnti = 0; cnti < this._ands.length; cnti++) {
                    const data = this._ands[cnti];
                    if (data instanceof And) {
                        rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                }
                return rtn_val;
            }
            toString(index, _cb = null) {
                const rtn_val = new stringbuilder_1.StringBuilder();
                rtn_val.append('(');
                for (let cnti = 0; cnti < this._ands.length; cnti++) {
                    const data = this._ands[cnti];
                    rtn_val.append(os_1.EOL);
                    cnti < 1 && rtn_val.append(`AND `);
                    if (data instanceof And) {
                        rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                }
                rtn_val.append(os_1.EOL);
                rtn_val.append('(');
                return rtn_val.toString();
            }
        }
        BQuery.And = And;
        class Or {
            constructor(...args) {
                this._prepared = false;
                this._ors = new Array();
                this._ors.push(...args);
            }
            add(...args) {
                this._ors.push(...args);
                return this;
            }
            setPrepared(prepared) {
                this._prepared = prepared;
                return this;
            }
            isPrepared() {
                return this._prepared;
            }
            count() {
                return this._ors.length;
            }
            toAZData(index, _cb = null) {
                const rtn_val = new azdata_1.AZData();
                if (!this.isPrepared())
                    return rtn_val;
                for (let cnti = 0; cnti < this._ors.length; cnti++) {
                    const data = this._ors[cnti];
                    if (data instanceof And) {
                        rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.add(data.setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                }
                return rtn_val;
            }
            toString(index, _cb = null) {
                const rtn_val = new stringbuilder_1.StringBuilder();
                rtn_val.append('(');
                for (let cnti = 0; cnti < this._ors.length; cnti++) {
                    const data = this._ors[cnti];
                    rtn_val.append(os_1.EOL);
                    cnti < 1 && rtn_val.append(`AND `);
                    if (data instanceof And) {
                        rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.append(data.setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                }
                rtn_val.append(os_1.EOL);
                rtn_val.append(')');
                return rtn_val.toString();
            }
        }
        BQuery.Or = Or;
    })(BQuery = AZSql.BQuery || (AZSql.BQuery = {}));
    class Basic extends AZSql.BQuery {
        constructor(table_name, azsql_or_option, prepared) {
            super(table_name, prepared);
            this._azsql = null;
            if (typeof azsql_or_option !== 'undefined') {
                if (azsql_or_option instanceof AZSql) {
                    this._azsql = azsql_or_option;
                }
                else {
                    this._azsql = new AZSql(azsql_or_option);
                }
            }
        }
        setIsPrepared(prepared) {
            super.setIsPrepared(prepared);
            return this;
        }
        clear() {
            super.clear();
            return this;
        }
        set(column, value, value_type = BQuery.VALUETYPE.VALUE) {
            super.set(column, value, value_type);
            return this;
        }
        clearSet() {
            super.clearSet();
            return this;
        }
        where(column_or_data, value, where_type, value_type) {
            super.where(column_or_data, value, where_type, value_type);
            return this;
        }
        clearWhere() {
            this._sql_where = new Array();
            return this;
        }
        async doInsert() {
            if (typeof this._azsql === 'undefined') {
                return { header: null, err: new Error('AZSql is not defined') };
            }
            return await this._azsql.executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT), this.getPreparedParameters());
        }
        async doUpdate(_require_where = true) {
            if (_require_where && this._sql_where.length < 1) {
                return { header: null, err: new Error('where clause required') };
            }
            if (typeof this._azsql === 'undefined') {
                return { header: null, err: new Error('AZSql is not defined') };
            }
            return await this._azsql.executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE), this.getPreparedParameters());
        }
        async doDelete(_require_where = true) {
            if (_require_where && this._sql_where.length < 1) {
                return { header: null, err: new Error('where clause required') };
            }
            if (typeof this._azsql === 'undefined') {
                return { header: null, err: new Error('AZSql is not defined') };
            }
            return await this._azsql.executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE), this.getPreparedParameters());
        }
    }
    AZSql.Basic = Basic;
})(AZSql = exports.AZSql || (exports.AZSql = {}));
