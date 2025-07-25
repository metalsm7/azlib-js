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
const mariadb = __importStar(require("mariadb"));
const mysql2 = __importStar(require("mysql2/promise"));
const sqlite3 = __importStar(require("sqlite3"));
// import { AZMap } from './azmap';
const azdata_1 = require("./azdata");
const azlist_1 = require("./azlist");
const stringbuilder_1 = require("./stringbuilder");
class AZSql {
    constructor(connection_or_option, is_debug = false) {
        this._option = {};
        this._connected = false;
        this._open_self = false;
        // PoolPromise, Cluster -> mariadb / PromisePool, PromisePoolCluster -> mysql
        this._instance_name = null;
        this._query = null;
        this._parameters = null;
        this._return_parameters = null;
        this._results = null;
        this._identity = false;
        this._in_transaction = false;
        // protected _transaction: any = null;
        this._transaction_result = null;
        this._transaction_on_commit = null;
        this._transaction_on_rollback = null;
        this._is_stored_procedure = false;
        this._sql_connection = null;
        this._sql_pool = null;
        this._sql_pool_mariadb = null;
        this._is_prepared = false;
        this._is_modify = false; // sqlite용
        this._is_debug = false; // 디버깅용
        //
        this._is_debug = is_debug;
        //
        if (connection_or_option['sql_type'] !== undefined) {
            this._option = connection_or_option;
        }
        else {
            // if (this.isDebug() === true) console.log(`AZSql.constructor - connection_or_option`, (connection_or_option as any)?.pool ?? null);
            if (connection_or_option instanceof sqlite3.Database) {
                this._sql_connection = connection_or_option;
                this._connected = true;
                this._option.sql_type = AZSql.SQL_TYPE.SQLITE;
            }
            else {
                // console.log(`constructor - name`, connection_or_option.constructor.name);
                //
                this._instance_name = connection_or_option.constructor.name;
                //
                switch (this.instanceName) {
                    case 'PoolPromise':
                    case 'Cluster':
                        // mariadb
                        this._sql_pool_mariadb = connection_or_option;
                        this._connected = true;
                        this._option.sql_type = AZSql.SQL_TYPE.MARIADB;
                        break;
                    case 'PromisePool':
                    case 'PromisePoolCluster':
                    case 'PoolNamespace':
                        // mysql
                        // this._sql_connection = connection_or_option as mysql2.Connection;
                        this._sql_pool = connection_or_option;
                        this._connected = true;
                        this._option.sql_type = AZSql.SQL_TYPE.MYSQL;
                        break;
                }
            }
        }
    }
    clear() {
        this.setDebug(false);
        this.setModify(false);
        this.setStoredProcedure(false);
        this.setPrepared(false);
        this.setIdentity(false);
        this.clearQuery();
        this.clearParameters();
        this.clearReturnParameters();
        this.clearResults();
        // this.removeTran();
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
    setModify(modify) {
        this._is_modify = modify;
        return this;
    }
    isModify() {
        return this._is_modify;
    }
    setDebug(debug) {
        this._is_debug = debug;
        return this;
    }
    isDebug() {
        return this._is_debug;
    }
    setPrepared(prepared) {
        this._is_prepared = prepared;
        return this;
    }
    isPrepared() {
        return this._is_prepared;
    }
    // getPreapredQueryAndParams(): [string|null, Array<string>|null] {
    //     if (this._parameters === null) return [this._query, []];
    //     let query: string = this._query as string;
    //     const param: Array<string> = new Array<string>();
    //     const keys: Array<string> = this._parameters?.getKeys();
    //     const serialized_keys: string = keys.join('|');
    //     const regex: RegExp = new RegExp(`([^@])(${serialized_keys})([\r\n\\s\\t,)]|$)`);
    //     while (query.search(regex) > -1) {
    //         const match_array: RegExpMatchArray = query.match(regex) as RegExpMatchArray;
    //         const key: string|null = match_array && match_array.length > 2 ? match_array[2] : null;
    //         if (key == null) continue;
    //         const val: any = this._parameters?.get(key);
    //         if (typeof val !== 'undefined' && Array.isArray(val)) {
    //             let q_str: string = ',?'.repeat((val as Array<any>).length);
    //             q_str.length > 1 && (q_str = q_str.substring(1));
    //             query = query.replace(regex, `$1${q_str}$3`);
    //             for (let cnti: number = 0; cnti < (val as Array<any>).length; cnti++) {
    //                 param.push((val as Array<any>)[cnti]);
    //             }
    //         }
    //         else {
    //             query = query.replace(regex, '$1?$3');
    //             param.push(this._parameters?.get(key));
    //         }
    //     }
    //     return [query, param];
    // }
    getQueryAndParams() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if ((((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) === AZSql.SQL_TYPE.SQLITE ||
            ((_b = this.option) === null || _b === void 0 ? void 0 : _b.sql_type) === AZSql.SQL_TYPE.MYSQL ||
            ((_c = this.option) === null || _c === void 0 ? void 0 : _c.sql_type) === AZSql.SQL_TYPE.MARIADB) &&
            !this.isPrepared()) {
            if (this._parameters === null)
                return [this._query, []];
            const keys = (_d = this._parameters) === null || _d === void 0 ? void 0 : _d.getKeys();
            if (!keys || keys.length < 1)
                return [this._query, []];
            //
            let query = this._query;
            //
            const serialized_keys = keys.join('|');
            const regex = new RegExp(`([^@])(${serialized_keys})([\r\n\\s\\t,)]|$)`);
            while (query.search(regex) > -1) {
                const match_array = query.match(regex);
                const key = match_array && match_array.length > 2 ? match_array[2] : null;
                if (key == null)
                    continue;
                const val = (_e = this._parameters) === null || _e === void 0 ? void 0 : _e.get(key);
                if (typeof val !== 'undefined' && Array.isArray(val)) {
                    // let q_str: string = '';
                    val.forEach((col, idx, arr) => {
                        switch (typeof col) {
                            case 'number':
                            case 'boolean':
                                break;
                            default:
                                if ((col !== null && col !== void 0 ? col : null) === null) {
                                    arr[idx] = null;
                                }
                                else {
                                    arr[idx] = `'${col}'`;
                                }
                                break;
                        }
                    });
                    const q_str = val.join(',');
                    // q_str.length > 1 && (q_str = q_str.substring(1));
                    query = query.replace(regex, `$1${q_str}$3`);
                    // for (let cnti: number = 0; cnti < (val as Array<any>).length; cnti++) {
                    //     param.push((val as Array<any>)[cnti]);
                    // }
                }
                else {
                    let val = (_f = this._parameters) === null || _f === void 0 ? void 0 : _f.get(key);
                    switch (typeof val) {
                        case 'number':
                        case 'boolean':
                            break;
                        default:
                            if ((val !== null && val !== void 0 ? val : null) === null) {
                                val = null;
                            }
                            else {
                                val = `'${val}'`;
                            }
                            break;
                    }
                    query = query.replace(regex, `$1${val}$3`);
                    // param.push(this._parameters?.get(key));
                }
            }
            return [query, []];
        }
        if (this._parameters === null)
            return [this._query, []];
        let query = this._query;
        const keys = (_g = this._parameters) === null || _g === void 0 ? void 0 : _g.getKeys();
        //
        if (!keys || keys.length < 1) {
            return [this._query, []];
        }
        //
        const serialized_keys = keys.join('|');
        const param = new Array();
        const regex = new RegExp(`([^@])(${serialized_keys})([\r\n\\s\\t,)]|$)`);
        while (query.search(regex) > -1) {
            const match_array = query.match(regex);
            const key = match_array && match_array.length > 2 ? match_array[2] : null;
            if (key == null)
                continue;
            const val = (_h = this._parameters) === null || _h === void 0 ? void 0 : _h.get(key);
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
                param.push((_j = this._parameters) === null || _j === void 0 ? void 0 : _j.get(key));
            }
        }
        return [query, param];
    }
    getReturnQuery() {
        var _a, _b, _c;
        if (!this.hasReturnParameters())
            return null;
        const rtn_val = new stringbuilder_1.StringBuilder();
        rtn_val.append(`SELECT`);
        if (this._return_parameters instanceof azdata_1.AZData) {
            for (let cnti = 0; cnti < ((_b = (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.size()) !== null && _b !== void 0 ? _b : 0); cnti++) {
                rtn_val.append(' ');
                cnti > 0 && rtn_val.append(',');
                rtn_val.append(`${(_c = this._return_parameters) === null || _c === void 0 ? void 0 : _c.getKey(cnti)}`);
            }
        }
        else {
            const keys = Object.keys(this._return_parameters);
            for (let cnti = 0; cnti < keys.length; cnti++) {
                rtn_val.append(' ');
                cnti > 0 && rtn_val.append(',');
                rtn_val.append(`${keys[cnti]}`);
            }
        }
        return rtn_val.toString();
    }
    setParameters(parameters) {
        if (this._parameters === null) {
            this._parameters = new azdata_1.AZData();
        }
        else {
            this._parameters.clear();
        }
        if (parameters instanceof azdata_1.AZData) {
            this._parameters = parameters;
        }
        else {
            const keys = Object.keys(parameters);
            for (let cnti = 0; cnti < keys.length; cnti++) {
                const key = keys[cnti];
                const val = parameters[key];
                this.addParameter(key, val);
            }
        }
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
    hasParameters() {
        return this._parameters !== null && this._parameters instanceof azdata_1.AZData && this._parameters.size() > 0;
    }
    setReturnParameters(parameters) {
        var _a;
        // if (this._return_parameters === null) {
        //     this._return_parameters = new AZData();
        // }
        // else { 
        //     this._return_parameters.clear();
        // }
        if (this._return_parameters instanceof azdata_1.AZData) {
            (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.clear();
        }
        // if (parameters instanceof AZData) {
        //     this._return_parameters = parameters;
        // }
        // else {
        //     const keys: Array<string> = Object.keys(parameters);
        //     for (let cnti: number = 0; cnti < keys.length; cnti++) {
        //         const key: string = keys[cnti];
        //         const val: any = (parameters as any)[key];
        //         this.addReturnParameter(key, val);
        //     }
        // }
        this._return_parameters = parameters;
        return this;
    }
    getReturnParamters() {
        return this._return_parameters;
    }
    getReturnParamter(key) {
        var _a;
        if (this._return_parameters instanceof azdata_1.AZData) {
            return (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.get(key);
        }
        else {
            return this._return_parameters[key];
        }
    }
    addReturnParameter(key, value) {
        var _a;
        if (this._return_parameters instanceof azdata_1.AZData) {
            (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.add(key, value);
        }
        return this;
    }
    addReturnParamters(paramters) {
        var _a;
        if (this._return_parameters instanceof azdata_1.AZData) {
            (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.add(paramters);
        }
        return this;
    }
    updateReturnParamter(key, value) {
        var _a;
        if (this._return_parameters instanceof azdata_1.AZData) {
            (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.set(key, value);
        }
        else {
            this._return_parameters[key] = value;
        }
        return this;
    }
    clearReturnParameters() {
        var _a;
        if (this._return_parameters instanceof azdata_1.AZData) {
            (_a = this._return_parameters) === null || _a === void 0 ? void 0 : _a.clear();
        }
        return this;
    }
    removeReturnParamters() {
        this._return_parameters = null;
        return this;
    }
    hasReturnParameters() {
        return this._return_parameters !== null &&
            ((this._return_parameters instanceof azdata_1.AZData && this._return_parameters.size() > 0) ||
                (typeof this._return_parameters === 'object' && Object.keys(this._return_parameters).length > 0));
    }
    setResults(rows) {
        this._results = rows;
        return this;
    }
    addResult(row) {
        this._results === null && (this._results = new Array());
        this._results.push(row);
        return this;
    }
    clearResults() {
        this._results = null;
        return this;
    }
    setTransactionResults(rows) {
        this._transaction_result = rows;
        return this;
    }
    addTransactionResult(row) {
        this._transaction_result === null && (this._transaction_result = new Array());
        this._transaction_result.push(row);
        return this;
    }
    clearTransactionResults() {
        this._transaction_result = null;
        return this;
    }
    hasTransactionResults() {
        return this._transaction_result !== null && Array.isArray(this._transaction_result) && this._transaction_result.length > 0;
    }
    getTransactionResults() {
        return this._transaction_result;
    }
    getTransactionResult(idx) {
        if (this._transaction_result === null || !Array.isArray(this._transaction_result))
            return null;
        if (idx < 0 || idx >= this._transaction_result.length)
            return null;
        return this._transaction_result[idx];
    }
    hasResults() {
        return this._results !== null && Array.isArray(this._results) && this._results.length > 0;
    }
    getResults() {
        return this._results;
    }
    getResult(idx) {
        var _a, _b;
        if (this._results === null || !Array.isArray(this._results))
            return null;
        if (idx < 0 || idx >= ((_b = (_a = this._results) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0))
            return null;
        return this._results[idx];
    }
    setIdentity(identity) {
        this._identity = identity;
        return this;
    }
    isIdentity() {
        return this._identity;
    }
    setStoredProcedure(is_stored_procedure) {
        this._is_stored_procedure = is_stored_procedure;
        return this;
    }
    isStoredProcedure() {
        return this._is_stored_procedure;
    }
    async openAsync() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        switch ((_a = this._option) === null || _a === void 0 ? void 0 : _a.sql_type) {
            case AZSql.SQL_TYPE.MARIADB:
                this._sql_connection = await new mariadb.createConnection({
                    host: (_b = this.option) === null || _b === void 0 ? void 0 : _b.server,
                    user: (_c = this.option) === null || _c === void 0 ? void 0 : _c.id,
                    password: (_d = this.option) === null || _d === void 0 ? void 0 : _d.pw,
                    database: (_e = this.option) === null || _e === void 0 ? void 0 : _e.catalog,
                });
                break;
            case AZSql.SQL_TYPE.MYSQL:
                this._sql_connection = await new mysql2.createConnection({
                    host: (_f = this.option) === null || _f === void 0 ? void 0 : _f.server,
                    user: (_g = this.option) === null || _g === void 0 ? void 0 : _g.id,
                    password: (_h = this.option) === null || _h === void 0 ? void 0 : _h.pw,
                    database: (_j = this.option) === null || _j === void 0 ? void 0 : _j.catalog,
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
        this._connected = this._open_self = this._sql_connection !== null;
        return this._connected;
    }
    async closeAsync() {
        var _a;
        if (this.isDebug() === true)
            console.log(`AZSql.closeAsync - inTransaction`);
        if (this.inTransaction || !this._open_self)
            return;
        switch ((_a = this._option) === null || _a === void 0 ? void 0 : _a.sql_type) {
            case AZSql.SQL_TYPE.MARIADB:
                if (this.isDebug() === true)
                    console.log(`AZSql.closeAsync - _sql_connection.release`);
                await this._sql_connection.release();
                break;
            case AZSql.SQL_TYPE.MYSQL:
                if (this.isDebug() === true)
                    console.log(`AZSql.closeAsync - _sql_connection.release`);
                this._sql_connection.release();
                break;
            case AZSql.SQL_TYPE.SQLITE:
                await new Promise((resolve, reject) => {
                    if (this.isDebug() === true)
                        console.log(`AZSql.closeAsync - _sql_connection.close`);
                    this._sql_connection.close((_res) => {
                        if (_res === null)
                            resolve();
                        reject(_res);
                    });
                });
                break;
        }
        this._sql_connection = null;
        // this._connected = false;
        this._open_self = false;
    }
    async beginTran(_on_commit, _on_rollback) {
        var _a, _b;
        if (this.isDebug() === true)
            console.log(`AZSql.beginTran`, (_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type);
        if (this._in_transaction)
            throw new Error('Transaction in use');
        // if (this._transaction !== null) throw new Error('Transaction exists');
        !this._connected && await this.openAsync();
        switch ((_b = this.option) === null || _b === void 0 ? void 0 : _b.sql_type) {
            case AZSql.SQL_TYPE.MARIADB:
                //
                this._sql_connection = await this._sql_pool_mariadb.getConnection();
                this._open_self = true;
                if (this.isDebug() === true)
                    console.log(`AZSql.beginTran - getConnection`);
                //
                await this._sql_connection.beginTransaction()
                    .catch((err) => {
                    this._in_transaction = false;
                })
                    .then(() => {
                    this._in_transaction = true;
                    typeof _on_commit !== 'undefined' && (this._transaction_on_commit = _on_commit);
                    typeof _on_rollback !== 'undefined' && (this._transaction_on_rollback = _on_rollback);
                });
                if (this.isDebug() === true)
                    console.log(`AZSql.beginTran - inTransaction`, this.inTransaction);
                //
                break;
            case AZSql.SQL_TYPE.MYSQL:
                if (typeof this._sql_pool['commit'] === 'undefined') {
                    // if (typeof (this._sql_pool as any)['_cluster'] === 'undefined') {
                    if (this.instanceName === 'PromisePool') {
                        // if (typeof (this._sql_connection as any)['of'] === 'undefined') {
                        this._sql_pool = this._sql_pool;
                        this._sql_connection = await this._sql_pool.getConnection();
                        this._open_self = true;
                        if (this.isDebug() === true)
                            console.log(`AZSql.beginTran - getConnection`);
                    }
                    else {
                        this._sql_pool = this._sql_pool;
                        this._sql_connection = await new Promise((resolve) => {
                            var _a;
                            (_a = this._sql_pool) === null || _a === void 0 ? void 0 : _a.getConnection((err, conn) => {
                                if (err)
                                    throw err;
                                this._open_self = true;
                                resolve(conn);
                            });
                        });
                        if (this.isDebug() === true)
                            console.log(`AZSql.beginTran - getConnection`);
                    }
                }
                // this._transaction = (this._sql_connection as mysql2.Connection).beginTransaction();
                // this._transaction
                //     .catch((err: Error) => {
                //         this._transaction = null;
                //     })
                //     .then(() => {
                //         this._in_transaction = true;
                //         typeof _on_commit !== 'undefined' && (this._transaction_on_commit = _on_commit);
                //         typeof _on_rollback !== 'undefined' && (this._transaction_on_rollback = _on_rollback);
                //     });
                await this._sql_connection.beginTransaction()
                    .catch((err) => {
                    this._in_transaction = false;
                })
                    .then(() => {
                    this._in_transaction = true;
                    typeof _on_commit !== 'undefined' && (this._transaction_on_commit = _on_commit);
                    typeof _on_rollback !== 'undefined' && (this._transaction_on_rollback = _on_rollback);
                });
                if (this.isDebug() === true)
                    console.log(`AZSql.beginTran - inTransaction`, this.inTransaction);
                break;
        }
    }
    async commit(cb) {
        var _a;
        const rtn_val = this.getTransactionResults();
        //
        let err = null;
        //
        try {
            if (this._in_transaction) {
                switch ((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) {
                    case AZSql.SQL_TYPE.MARIADB:
                        await this._sql_connection.commit();
                        break;
                    case AZSql.SQL_TYPE.MYSQL:
                        await this._sql_connection.commit();
                        break;
                }
                this._transaction_on_commit && this._transaction_on_commit();
            }
        }
        catch (e) {
            err = e;
            // if (!cb) throw e;
        }
        finally {
            this.removeTran();
            await this.closeAsync();
        }
        //
        err && cb && cb(null, err);
        //
        return { res: rtn_val, err };
    }
    async rollback() {
        var _a;
        try {
            if (!this._in_transaction)
                throw new Error('Transaction not exists');
            switch ((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) {
                case AZSql.SQL_TYPE.MARIADB:
                    if (this.isDebug() === true)
                        console.log(`AZSql.rollback`);
                    await this._sql_connection.rollback()
                        .catch(reason => {
                        if (this.isDebug() === true)
                            console.log(`AZSql.rollback - rollback.catch`, reason);
                    });
                    break;
                    break;
                case AZSql.SQL_TYPE.MYSQL:
                    if (this.isDebug() === true)
                        console.log(`AZSql.rollback`);
                    await this._sql_connection.rollback()
                        .catch(reason => {
                        if (this.isDebug() === true)
                            console.log(`AZSql.rollback - rollback.catch`, reason);
                    });
                    break;
            }
            this._transaction_on_rollback && this._transaction_on_rollback();
        }
        catch (e) {
            throw e;
        }
        finally {
            this.removeTran();
            await this.closeAsync();
        }
    }
    removeTran() {
        // if (this._sql_pool !== null) {
        //     this._sql_connection = this._sql_pool;
        //     this._sql_pool = null;
        // }
        // this._transaction = null;
        this._in_transaction = false;
        this._transaction_result = null;
        this._transaction_on_commit = null;
        this._transaction_on_rollback = null;
        return this;
    }
    async getAsync(query_or_id, param_or_id, return_param_or_id, is_sp) {
        if (this.isDebug() === true)
            console.log(`AZSql.getAsync - query_or_id`, query_or_id, 'param_or_id', param_or_id, 'return_param_or_id', return_param_or_id, 'is_sp', is_sp);
        // const res: object = await this.getDataAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        // let rtn_val: any = null;
        // const keys: Array<string> = Object.keys(res);
        // keys.length > 0 && (rtn_val = (res as any)[keys[0]]);
        // return rtn_val;
        // const res: object|null = await this.getDataAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        const res = this.hasResults() ? this.getResults() : new Array();
        //
        if (res.length < 1)
            return null;
        let rtn_val = null;
        const keys = Object.keys(res[0]);
        keys.length > 0 && (rtn_val = res[0][keys[0]]);
        //
        this.inTransaction && this.addTransactionResult(rtn_val);
        //
        return rtn_val;
    }
    async getDataAsync(query_or_id, param_or_id, return_param_or_id, is_sp) {
        if (this.isDebug() === true)
            console.log(`AZSql.getDataAsync - query_or_id`, query_or_id, 'param_or_id', param_or_id, 'return_param_or_id', return_param_or_id, 'is_sp', is_sp);
        // const res: Array<any> = await this.getListAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        // let rtn_val: object = {};
        // res.length > 0 && (rtn_val = res[0]);
        // return rtn_val;
        //
        // const res: Array<any> = await this.getListAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        const res = this.hasResults() ? this.getResults() : new Array();
        //
        const rtn_val = res.length > 0 ? res[0] : null;
        //
        this.inTransaction && this.addTransactionResult(rtn_val);
        //
        return rtn_val;
    }
    async getListAsync(query_or_id, param_or_id, return_param_or_id, is_sp) {
        if (this.isDebug() === true)
            console.log(`AZSql.getListAsync - query_or_id`, query_or_id, 'param_or_id', param_or_id, 'return_param_or_id', return_param_or_id, 'is_sp', is_sp);
        // const res: AZSql.Result = await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        // if (typeof res.rows === 'undefined' && typeof res.err !== 'undefined') throw res.err;
        // let rtn_val: Array<any> = new Array<any>();
        // typeof res.rows !== 'undefined' && (rtn_val = res.rows);
        // return rtn_val;
        await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        const res = this.hasResults() ? this.getResults() : new Array();
        //
        this.inTransaction && this.addTransactionResult(res);
        //
        return res;
    }
    async executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp) {
        var _a, _b, _c;
        typeof is_sp !== 'undefined' && this.setStoredProcedure(is_sp);
        if (typeof return_param_or_id !== 'undefined') {
            if (typeof return_param_or_id !== 'boolean') {
                this.setReturnParameters(return_param_or_id);
            }
            else {
                this.setIdentity(return_param_or_id);
            }
        }
        if (typeof param_or_id !== 'undefined') {
            if (typeof param_or_id !== 'boolean') {
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
        // let rtn_val: AZSql.Result = {} as AZSql.Result;
        let rtn_val = 0;
        if (this.isDebug() === true)
            console.log(`AZSql.executeAsync - connected`, this.connected);
        if (!this.connected)
            await this.openAsync();
        // const is_prepared: boolean = this.isPrepared || this.getParamters() !== null && ((this.getParamters() as AZData).size() > 0);
        const is_prepared = this.isPrepared();
        if (this.isDebug() === true)
            console.log(`AZSql.executeAsync - is_prepared`, is_prepared);
        if (this.inTransaction && !this.connected)
            return Promise.reject(new Error('Not connected'));
        if (this.connected) {
            try {
                let [query, params] = this.getQueryAndParams();
                // if (this.isDebug() === true) console.log(`AZSql.executeAsync - getQueryAndParams`, query, params);
                switch ((_a = this.option) === null || _a === void 0 ? void 0 : _a.sql_type) {
                    case AZSql.SQL_TYPE.MARIADB:
                        if (is_prepared) {
                            let res = null;
                            let err = null;
                            //
                            // const is_cluster = (this._sql_pool_mariadb as any).constructor.name === 'Cluster';
                            const is_cluster = this.instanceName === 'Cluster';
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!this.inTransaction || this._sql_connection === null) {
                                this._sql_pool_mariadb = this._sql_pool_mariadb;
                                this._sql_connection = await this._sql_pool_mariadb.getConnection();
                                this._open_self = true;
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - getConnection`);
                            }
                            //
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - execute`, query, params);
                            [res, err] = await this._sql_connection.execute(query, params)
                                .then((result) => {
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - execute.then`, result);
                                return [result, null];
                            })
                                .catch(async (err) => {
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - execute.catch`, err);
                                this.inTransaction && await this.rollback();
                                return [null, err];
                            });
                            //
                            if (err) {
                                // rtn_val.err = err;
                                throw err;
                            }
                            else {
                                if (Array.isArray(res)) {
                                    this.setResults(res);
                                }
                                else {
                                    // { affectedRows: 1, insertId: 53n, warningStatus: 0 }
                                    const header = res;
                                    // rtn_val.affected = header.affectedRows;
                                    // rtn_val.identity = header.insertId;
                                    // rtn_val.header = header;
                                    rtn_val = this.isIdentity() ? Number(header.insertId) : header.affectedRows;
                                    //
                                    this.inTransaction && this.addTransactionResult(rtn_val);
                                }
                                //
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - isStoredProcedure`, this.isStoredProcedure());
                                if (this.isStoredProcedure()) {
                                    const return_query = this.getReturnQuery();
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - return_query`, return_query);
                                    if (return_query !== null) {
                                        let r_res = null;
                                        let r_err = null;
                                        // if (!is_cluster) {
                                        //     [r_res, r_err] = await (this._sql_connection as mariadb.Connection).query(return_query as string)
                                        //         .then((result: any) => {
                                        //             return [ result, null ];
                                        //         })
                                        //         .catch(async (err: Error) => {
                                        //             this.inTransaction && await this.rollback();
                                        //             return [ null, err ];
                                        //         });
                                        // }
                                        // else {
                                        //     [r_res, r_err] = await new Promise((resolve) => {
                                        //         (this._sql_connection as mysql2plain.PoolConnection).query(return_query as string, async (err, result) => {
                                        //             // console.log(`az.cluster.result`, result);\
                                        //             if (err) {
                                        //                 this.inTransaction && await this.rollback();
                                        //                 resolve([null, err]);
                                        //             }
                                        //             resolve([[result, []], null]);
                                        //         });
                                        //     });
                                        // }
                                        [r_res, r_err] = await this._sql_connection.query(return_query)
                                            .then((result) => {
                                            if (this.isDebug() === true)
                                                console.log(`AZSql.executeAsync - query.then`, result);
                                            return [result, null];
                                        })
                                            .catch(async (err) => {
                                            this.inTransaction && await this.rollback();
                                            return [null, err];
                                        });
                                        if (r_err) {
                                            // rtn_val.err = err;
                                            throw r_err;
                                        }
                                        else {
                                            if (Array.isArray(r_res)) {
                                                /**
                                                 * [
                                                 *  rows,
                                                 *  ColumnDefinitaion,
                                                 * ]
                                                 */
                                                const return_params = r_res[0];
                                                const return_keys = Object.keys(return_params);
                                                for (let cnti = 0; cnti < return_keys.length; cnti++) {
                                                    const return_key = return_keys[cnti];
                                                    let return_val = return_params[return_key];
                                                    if (this.isDebug() === true)
                                                        console.log(`AZSql.executeAsync - return_key: return_val`, { return_key, return_val });
                                                    if (typeof return_val === 'bigint')
                                                        return_val = Number(return_val);
                                                    this.updateReturnParamter(return_key, return_val);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            let res = null;
                            let err = null;
                            //
                            // const is_cluster = typeof (this._sql_pool as any)['_cluster'] !== 'undefined';
                            const is_cluster = this.instanceName === 'PoolPromise';
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!this.inTransaction || this._sql_connection === null) {
                                this._sql_pool_mariadb = this._sql_pool_mariadb;
                                this._sql_connection = await this._sql_pool_mariadb.getConnection();
                                this._open_self = true;
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - getConnection`);
                            }
                            //
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - execute`, query, params);
                            [res, err] = await this._sql_connection.query(query, params)
                                .then((result) => {
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - execute.then`, result);
                                return [result, null];
                            })
                                .catch(async (err) => {
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - execute.catch`, err);
                                this.inTransaction && await this.rollback();
                                return [null, err];
                            });
                            //
                            if (err) {
                                // rtn_val.err = err;
                                throw err;
                            }
                            else {
                                if (Array.isArray(res)) {
                                    this.setResults(res);
                                }
                                else {
                                    // { affectedRows: 1, insertId: 53n, warningStatus: 0 }
                                    const header = res;
                                    // rtn_val.affected = header.affectedRows;
                                    // rtn_val.identity = header.insertId;
                                    // rtn_val.header = header;
                                    rtn_val = this.isIdentity() ? Number(header.insertId) : header.affectedRows;
                                    //
                                    this.inTransaction && this.addTransactionResult(rtn_val);
                                }
                                //
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - isStoredProcedure`, this.isStoredProcedure());
                                if (this.isStoredProcedure()) {
                                    const return_query = this.getReturnQuery();
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - return_query`, return_query);
                                    if (return_query !== null) {
                                        let r_res = null;
                                        let r_err = null;
                                        // if (!is_cluster) {
                                        //     [r_res, r_err] = await (this._sql_connection as mariadb.Connection).query(return_query as string)
                                        //         .then((result: any) => {
                                        //             return [ result, null ];
                                        //         })
                                        //         .catch(async (err: Error) => {
                                        //             this.inTransaction && await this.rollback();
                                        //             return [ null, err ];
                                        //         });
                                        // }
                                        // else {
                                        //     [r_res, r_err] = await new Promise((resolve) => {
                                        //         (this._sql_connection as mysql2plain.PoolConnection).query(return_query as string, async (err, result) => {
                                        //             // console.log(`az.cluster.result`, result);\
                                        //             if (err) {
                                        //                 this.inTransaction && await this.rollback();
                                        //                 resolve([null, err]);
                                        //             }
                                        //             resolve([[result, []], null]);
                                        //         });
                                        //     });
                                        // }
                                        [r_res, r_err] = await this._sql_connection.query(return_query)
                                            .then((result) => {
                                            if (this.isDebug() === true)
                                                console.log(`AZSql.executeAsync - query.then`, result);
                                            return [result, null];
                                        })
                                            .catch(async (err) => {
                                            this.inTransaction && await this.rollback();
                                            return [null, err];
                                        });
                                        if (r_err) {
                                            // rtn_val.err = err;
                                            throw r_err;
                                        }
                                        else {
                                            if (Array.isArray(r_res)) {
                                                /**
                                                 * [
                                                 *  rows,
                                                 *  ColumnDefinitaion,
                                                 * ]
                                                 */
                                                const return_params = r_res[0];
                                                const return_keys = Object.keys(return_params);
                                                for (let cnti = 0; cnti < return_keys.length; cnti++) {
                                                    const return_key = return_keys[cnti];
                                                    let return_val = return_params[return_key];
                                                    if (this.isDebug() === true)
                                                        console.log(`AZSql.executeAsync - return_key: return_val`, { return_key, return_val });
                                                    if (typeof return_val === 'bigint')
                                                        return_val = Number(return_val);
                                                    this.updateReturnParamter(return_key, return_val);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    case AZSql.SQL_TYPE.MYSQL:
                        // if (this.isDebug() === true) console.log(`AZSql.executeAsync - MYSQL`);
                        if (is_prepared) {
                            // let rows: Array<any>|any|null = null;
                            let res = null;
                            let err = null;
                            //
                            // const is_cluster = typeof (this._sql_pool as any)['_cluster'] !== 'undefined';
                            const is_cluster = ['PromisePoolCluster', 'PoolNamespace',].includes((_b = this.instanceName) !== null && _b !== void 0 ? _b : ''); // this.instanceName === 'PromisePoolCluster';
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!is_cluster) {
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool;
                                    this._sql_connection = await this._sql_pool.getConnection();
                                    this._open_self = true;
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - getConnection`);
                                }
                                //
                                if (this.isDebug() === true)
                                    console.log(`AZSql.executeAsync - execute`, query, params);
                                [res, err] = await this._sql_connection.execute(query, params)
                                    .then((result) => {
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - execute.then`, result);
                                    return [result, null];
                                })
                                    .catch(async (err) => {
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - execute.catch`, err);
                                    this.inTransaction && await this.rollback();
                                    return [null, err];
                                });
                            }
                            else {
                                // this._sql_pool = this._sql_connection as mysql2plain.PoolCluster;
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool;
                                    this._sql_connection = await new Promise((resolve) => {
                                        var _a;
                                        (_a = this._sql_pool) === null || _a === void 0 ? void 0 : _a.getConnection((err, conn) => {
                                            if (err)
                                                throw err;
                                            this._open_self = true;
                                            resolve(conn);
                                        });
                                    });
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - getConnection`);
                                }
                                //
                                [res, err] = await new Promise((resolve) => {
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - execute`, query, params);
                                    this._sql_connection.execute(query, params, async (err, result) => {
                                        if (this.isDebug() === true)
                                            console.log(`AZSql.executeAsync - execute.callback`, err, result);
                                        if (err) {
                                            this.inTransaction && await this.rollback();
                                            resolve([null, err]);
                                        }
                                        resolve([[result, []], null]);
                                    });
                                });
                                // console.log(`az.cluster.res`, res);
                            }
                            /*const [res, err] = await (this._sql_connection as mysql2.Connection).execute(query as string, params)
                                .then((res: any) => {
                                    return [ res, null ];
                                })
                                .catch(async (err: Error) => {
                                    this.inTransaction && await this.rollback();
                                    return [ null, err ];
                                });*/
                            if (err) {
                                // rtn_val.err = err;
                                throw err;
                            }
                            else {
                                // if ((res as any)[1] !== null) throw (res as any)[1] as Error;
                                // rtn_val = this.isIdentity() ?
                                //     ((res as Array<any>)[0] as ResultSetHeader).insertId :
                                //     ((res as Array<any>)[0] as ResultSetHeader).affectedRows;
                                const rows = res[0];
                                if (Array.isArray(rows)) {
                                    rows.length > 1 && Array.isArray(rows[0]) && rows.pop();
                                    /**
                                     * [
                                     *  rows,
                                     *  ColumnDefinitaion,
                                     * ]
                                     */
                                    // rtn_val.rows = (res as Array<any>)[0] as Array<any>;
                                    this.setResults(rows);
                                    //
                                    // this.inTransaction && this.addTransactionResult(rows);
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
                                    // rtn_val.affected = header.affectedRows;
                                    // rtn_val.identity = header.insertId;
                                    // rtn_val.header = header;
                                    rtn_val = this.isIdentity() ? header.insertId : header.affectedRows;
                                    //
                                    this.inTransaction && this.addTransactionResult(rtn_val);
                                }
                                //
                                if (this.isStoredProcedure()) {
                                    const return_query = this.getReturnQuery();
                                    if (return_query !== null) {
                                        // const [r_res, r_err] = await (this._sql_connection as mysql2.Connection).execute(return_query as string)
                                        //     .then((res: any) => {
                                        //         return [ res, null ];
                                        //     })
                                        //     .catch(async (err: Error) => {
                                        //         this.inTransaction && await this.rollback();
                                        //         return [ null, err ];
                                        //     });
                                        //
                                        let r_res = null;
                                        let r_err = null;
                                        if (!is_cluster) {
                                            [r_res, r_err] = await this._sql_connection.query(return_query)
                                                .then((result) => {
                                                return [result, null];
                                            })
                                                .catch(async (err) => {
                                                this.inTransaction && await this.rollback();
                                                return [null, err];
                                            });
                                        }
                                        else {
                                            [r_res, r_err] = await new Promise((resolve) => {
                                                this._sql_connection.query(return_query, async (err, result) => {
                                                    // console.log(`az.cluster.result`, result);\
                                                    if (err) {
                                                        this.inTransaction && await this.rollback();
                                                        resolve([null, err]);
                                                    }
                                                    resolve([[result, []], null]);
                                                });
                                            });
                                        }
                                        if (r_err) {
                                            // rtn_val.err = err;
                                            throw r_err;
                                        }
                                        else {
                                            if (Array.isArray(r_res[0])) {
                                                /**
                                                 * [
                                                 *  rows,
                                                 *  ColumnDefinitaion,
                                                 * ]
                                                 */
                                                const return_params = r_res[0][0];
                                                const return_keys = Object.keys(return_params);
                                                for (let cnti = 0; cnti < return_keys.length; cnti++) {
                                                    const return_key = return_keys[cnti];
                                                    const return_val = return_params[return_key];
                                                    this.updateReturnParamter(return_key, return_val);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            let res = null;
                            let err = null;
                            //
                            // const is_cluster = typeof (this._sql_pool as any)['_cluster'] !== 'undefined';
                            const is_cluster = ['PromisePoolCluster', 'PoolNamespace',].includes((_c = this.instanceName) !== null && _c !== void 0 ? _c : ''); // this.instanceName === 'PromisePoolCluster';
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true)
                                console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!is_cluster) {
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool;
                                    this._sql_connection = await this._sql_pool.getConnection();
                                    this._open_self = true;
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - getConnection`);
                                }
                                //
                                [res, err] = await this._sql_connection.query(query, params)
                                    .then((result) => {
                                    return [result, null];
                                })
                                    .catch(async (err) => {
                                    this.inTransaction && await this.rollback();
                                    return [null, err];
                                });
                            }
                            else {
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool;
                                    this._sql_connection = await new Promise((resolve) => {
                                        var _a;
                                        (_a = this._sql_pool) === null || _a === void 0 ? void 0 : _a.getConnection((err, conn) => {
                                            if (err)
                                                throw err;
                                            this._open_self = true;
                                            resolve(conn);
                                        });
                                    });
                                    if (this.isDebug() === true)
                                        console.log(`AZSql.executeAsync - getConnection`);
                                }
                                //
                                [res, err] = await new Promise((resolve) => {
                                    this._sql_connection.query(query, params, async (err, result) => {
                                        // console.log(`az.cluster.result`, result);\
                                        if (err) {
                                            this.inTransaction && await this.rollback();
                                            resolve([null, err]);
                                        }
                                        resolve([[result, []], null]);
                                    });
                                });
                                // console.log(`az.cluster.res`, res);
                            }
                            // const [res, err] = await (this._sql_connection as mysql2.Connection).query(query as string, params)
                            //     .then((res: any) => {
                            //         return [ res, null ];
                            //     })
                            //     .catch(async (err: Error) => {
                            //         this.inTransaction && await this.rollback();
                            //         return [ null, err ];
                            //     });
                            if (err) {
                                // rtn_val.err = err;
                                throw err;
                            }
                            else {
                                const rows = res[0];
                                if (Array.isArray(rows)) {
                                    rows.length > 1 && Array.isArray(rows[0]) && rows.pop();
                                    // rows[rows.length - 1] instanceof mysql2.ResultSetHeader && rows.pop();
                                    // rtn_val.rows = (res as Array<any>)[0] as Array<any>;
                                    this.setResults(rows);
                                    //
                                    // this.inTransaction && this.addTransactionResult(rows);
                                }
                                else {
                                    const header = res[0];
                                    // rtn_val.affected = header.affectedRows;
                                    // rtn_val.identity = header.insertId;
                                    // rtn_val.header = header;
                                    rtn_val = this.isIdentity() ? header.insertId : header.affectedRows;
                                    //
                                    this.inTransaction && this.addTransactionResult(rtn_val);
                                }
                            }
                            //
                            if (this.isStoredProcedure()) {
                                const return_query = this.getReturnQuery();
                                if (return_query !== null) {
                                    // const [r_res, r_err] = await (this._sql_connection as mysql2.Connection).execute(return_query as string)
                                    //     .then((res: any) => {
                                    //         return [ res, null ];
                                    //     })
                                    //     .catch(async (err: Error) => {
                                    //         this.inTransaction && await this.rollback();
                                    //         return [ null, err ];
                                    //     });
                                    //
                                    let r_res = null;
                                    let r_err = null;
                                    if (!is_cluster) {
                                        [r_res, r_err] = await this._sql_connection.query(return_query)
                                            .then((result) => {
                                            return [result, null];
                                        })
                                            .catch(async (err) => {
                                            this.inTransaction && await this.rollback();
                                            return [null, err];
                                        });
                                    }
                                    else {
                                        [r_res, r_err] = await new Promise((resolve) => {
                                            this._sql_connection.query(return_query, async (err, result) => {
                                                // console.log(`az.cluster.result`, result);\
                                                if (err) {
                                                    this.inTransaction && await this.rollback();
                                                    resolve([null, err]);
                                                }
                                                resolve([[result, []], null]);
                                            });
                                        });
                                    }
                                    //
                                    if (r_err) {
                                        // rtn_val.err = err;
                                        throw r_err;
                                    }
                                    else {
                                        if (Array.isArray(r_res[0])) {
                                            /**
                                             * [
                                             *  rows,
                                             *  ColumnDefinitaion,
                                             * ]
                                             */
                                            const return_params = r_res[0][0];
                                            const return_keys = Object.keys(return_params);
                                            for (let cnti = 0; cnti < return_keys.length; cnti++) {
                                                const return_key = return_keys[cnti];
                                                const return_val = return_params[return_key];
                                                this.updateReturnParamter(return_key, return_val);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    case AZSql.SQL_TYPE.SQLITE:
                        // if (is_prepared) {
                        // const [query, params] = this.getQueryAndParams();
                        const [res, err] = await new Promise((resolve, _reject) => {
                            const stmt = this._sql_connection.prepare(query, (_res) => {
                                if (_res === null) {
                                    if (this.isIdentity() || this.isModify()) {
                                        stmt === null || stmt === void 0 ? void 0 : stmt.run(params, function (err) {
                                            if (err) {
                                                resolve([null, err]);
                                            }
                                            else {
                                                resolve([this, null]);
                                            }
                                        });
                                        stmt === null || stmt === void 0 ? void 0 : stmt.finalize();
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
                                        stmt === null || stmt === void 0 ? void 0 : stmt.finalize();
                                    }
                                }
                                else {
                                    resolve([null, _res]);
                                }
                            });
                        });
                        if (err) {
                            // rtn_val.err = err;
                            throw err;
                        }
                        else {
                            if (Array.isArray(res)) {
                                // rtn_val.rows = res;
                                this.setResults(res);
                            }
                            else {
                                // rtn_val.affected = (res as sqlite3.RunResult).changes;
                                // rtn_val.identity = (res as sqlite3.RunResult).lastID;
                                rtn_val = this.isIdentity() && !this.isModify() ? res.lastID : res.changes;
                            }
                        }
                        // }
                        // else {
                        //     const [res, err] = await new Promise((resolve: any, _reject: any) => {
                        //         if (this.isIdentity()) {
                        //             (this._sql_connection as sqlite3.Database).run(this._query as string, function (err: Error) {
                        //                 if (err) {
                        //                     resolve([null, err]);
                        //                 }
                        //                 else {
                        //                     resolve([this as sqlite3.RunResult, null]);
                        //                 }
                        //             });
                        //         }
                        //         else {
                        //             (this._sql_connection as sqlite3.Database).all(this._query as string, (err: Error, rows: Array<any>) => {
                        //                 if (err) {
                        //                     resolve([null, err]);
                        //                 }
                        //                 else {
                        //                     resolve([rows, null]);
                        //                 }
                        //             });
                        //         }
                        //     });
                        //     if (err) {
                        //         // rtn_val.err = err;
                        //         throw err;
                        //     }
                        //     else {
                        //         if (Array.isArray(res)) {
                        //             // rtn_val.rows = res;
                        //             this.setResults(res);
                        //         }
                        //         else {
                        //             // rtn_val.affected = (res as sqlite3.RunResult).changes;
                        //             // rtn_val.identity = (res as sqlite3.RunResult).lastID;
                        //             rtn_val = this.isIdentity() ? (res as sqlite3.RunResult).lastID : (res as sqlite3.RunResult).changes;
                        //         }
                        //     }
                        // }
                        break;
                }
            }
            catch (e) {
                // rtn_val.err = e;
                throw e;
            }
            finally {
                if (this.isDebug() === true)
                    console.log(`AZSql.executeAsync - finally`);
                this.setModify(false);
                await this.closeAsync()
                    .catch((e) => {
                    // rtn_val.err = e;
                    throw e;
                });
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
    //     typeof is_sp !== 'undefined' && this.setStoredProcedure(is_sp);
    //     if (typeof return_param_or_id !== 'undefined') {
    //         if (return_param_or_id instanceof AZData) {
    //             this.setReturnParameters(return_param_or_id as AZData);
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
    get instanceName() {
        return this._instance_name;
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
            // this.setPrepared(true);
            this._is_prepared = true;
        }
        setPrepared(prepared) {
            // this._is_prepared = prepared;
            return this;
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
            this._sql_select = null;
        }
        isPrepared() {
            return this._prepared;
        }
        setPrepared(prepared) {
            this._prepared = prepared;
            return this;
        }
        clear() {
            // this._table_name = null;
            this._prepared = false;
            this.clearSelect();
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
        clearSelect() {
            this._sql_select = null;
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
                    rtn_val.append(`SELECT${os_1.EOL}`);
                    rtn_val.append(` ${this._sql_select}${os_1.EOL}`);
                    rtn_val.append(`FROM ${this._table_name}${os_1.EOL}`);
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
        setPrepared(prepared) {
            super.setPrepared(prepared);
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
        async doSelectAsync(select = '*') {
            if (typeof this._azsql === 'undefined')
                throw new Error('AZSql is not defined');
            this._sql_select = select;
            // return await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.SELECT), this.getPreparedParameters());
            // const res: AZSql.Result = await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.SELECT), this.getPreparedParameters());
            // if (typeof res.rows === 'undefined' && typeof res.err !== 'undefined') throw res.err;
            // let rtn_val: Array<any> = new Array<any>();
            // typeof res.rows !== 'undefined' && (rtn_val = res.rows);
            // return rtn_val;
            //
            const cur_prepared = this._azsql.isPrepared();
            const cur_identity = this._azsql.isIdentity();
            //
            this._azsql
                .setIdentity(false)
                .setPrepared(this.isPrepared());
            //
            const rtn_val = await this._azsql.getListAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.SELECT), this.getPreparedParameters());
            //
            this._azsql
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }
        async doInsertAsync(req_identity = false) {
            if (typeof this._azsql === 'undefined') {
                // return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
                throw new Error('AZSql is not defined');
            }
            // const cur_identity: boolean = (this._azsql as AZSql).isIdentity();
            // _get_identity && (this._azsql as AZSql).setIdentity(true);
            // const rtn_val = await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT), this.getPreparedParameters());
            // (this._azsql as AZSql).setIdentity(cur_identity);
            // return rtn_val;
            //
            const cur_prepared = this._azsql.isPrepared();
            const cur_identity = this._azsql.isIdentity();
            //
            this._azsql
                .setIdentity(req_identity)
                .setPrepared(this.isPrepared());
            //
            const rtn_val = await this._azsql.executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT), this.getPreparedParameters());
            //
            this._azsql
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }
        async doUpdateAsync(_require_where = true) {
            if (_require_where && this._sql_where.length < 1) {
                // return {header: null, err: new Error('where clause required')} as AZSql.Result;
                throw new Error('where clause required');
            }
            if (typeof this._azsql === 'undefined') {
                // return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
                throw new Error('AZSql is not defined');
            }
            // return await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE), this.getPreparedParameters());
            //
            const cur_prepared = this._azsql.isPrepared();
            const cur_identity = this._azsql.isIdentity();
            //
            this._azsql
                .setIdentity(false)
                .setPrepared(this.isPrepared());
            //
            const rtn_val = await this._azsql.setModify(true).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE), this.getPreparedParameters());
            //
            this._azsql
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }
        async doDeleteAsync(_require_where = true) {
            if (_require_where && this._sql_where.length < 1) {
                // return {header: null, err: new Error('where clause required')} as AZSql.Result;
                throw new Error('where clause required');
            }
            if (typeof this._azsql === 'undefined') {
                // return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
                throw new Error('AZSql is not defined');
            }
            // return await (this._azsql as AZSql).setIdentity(true).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE), this.getPreparedParameters());
            //
            const cur_prepared = this._azsql.isPrepared();
            const cur_identity = this._azsql.isIdentity();
            //
            this._azsql
                .setIdentity(false)
                .setPrepared(this.isPrepared());
            //
            const rtn_val = await this._azsql.setModify(true).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE), this.getPreparedParameters());
            //
            this._azsql
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }
    }
    AZSql.Basic = Basic;
})(AZSql = exports.AZSql || (exports.AZSql = {}));
