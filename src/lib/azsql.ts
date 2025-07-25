import { EOL } from 'os';
import * as mariadb from 'mariadb';
import * as mysql2plain from 'mysql2';
import * as mysql2 from 'mysql2/promise';
import * as sqlite3 from 'sqlite3';
// import { AZMap } from './azmap';
import { AZData } from './azdata';
import { AZList } from './azlist';
import { StringBuilder } from './stringbuilder';

export interface TransactionResult {
    
}

export class AZSql {
    protected _option: AZSql.Option = {} as AZSql.Option;
    protected _connected: boolean = false;
    protected _open_self: boolean = false;

    // PoolPromise, Cluster -> mariadb / PromisePool, PromisePoolCluster -> mysql
    protected _instance_name: 'PoolPromise'|'Cluster'|'PromisePool'|'PromisePoolCluster'|'PoolNamespace'|null = null;
    
    protected _query: string|null = null;
    protected _parameters: AZData|null = null;
    protected _return_parameters: AZData|object|null = null;
    protected _results: Array<any>|null = null;
    protected _identity: boolean = false;

    protected _in_transaction: boolean = false;
    // protected _transaction: any = null;
    protected _transaction_result: Array<any>|null = null;
    protected _transaction_on_commit: Function|null = null;
    protected _transaction_on_rollback: Function|null = null;

    protected _is_stored_procedure: boolean = false;

    protected _sql_connection: mysql2.Connection|mysql2.Pool|mysql2plain.PoolConnection|mysql2.PoolConnection|mysql2plain.PoolCluster|mysql2.PoolCluster|mysql2plain.PoolNamespace|mysql2.PoolNamespace|sqlite3.Database|mariadb.Connection|mariadb.PoolConnection|null = null;

    protected _sql_pool: mysql2.Pool|mysql2plain.PoolCluster|mysql2.PoolCluster|mysql2plain.PoolNamespace|mysql2.PoolNamespace|null = null;
    protected _sql_pool_mariadb: mariadb.Pool|mariadb.PoolCluster|null = null;

    protected _is_prepared: boolean = false;

    protected _is_modify: boolean = false; // sqlite용

    protected _is_debug: boolean = false; // 디버깅용

    constructor(connection_or_option: AZSql.Option|mysql2.Connection|mysql2.Pool|mysql2plain.PoolConnection|mysql2.PoolConnection|mysql2plain.PoolCluster|mysql2.PoolCluster|mysql2plain.PoolNamespace|mysql2.PoolNamespace|sqlite3.Database|mariadb.Pool|mariadb.PoolCluster, is_debug: boolean = false) {
        //
        this._is_debug = is_debug;
        //
        if ((connection_or_option as AZSql.Option)['sql_type'] !== undefined) {
            this._option = connection_or_option as AZSql.Option;
        }
        else {
            // if (this.isDebug() === true) console.log(`AZSql.constructor - connection_or_option`, (connection_or_option as any)?.pool ?? null);
            if (connection_or_option instanceof sqlite3.Database) {
                this._sql_connection = connection_or_option as sqlite3.Database;
                this._connected = true;
                this._option.sql_type = AZSql.SQL_TYPE.SQLITE;
            }
            else {
                // console.log(`constructor - name`, connection_or_option.constructor.name);
                //
                this._instance_name = connection_or_option.constructor.name as 'PoolPromise'|'Cluster'|'PromisePool'|'PromisePoolCluster'|'PoolNamespace'|null;
                //
                switch (this.instanceName) {
                    case 'PoolPromise':
                    case 'Cluster':
                        // mariadb
                        this._sql_pool_mariadb = connection_or_option as mariadb.Pool|mariadb.PoolCluster;
                        this._connected = true;
                        this._option.sql_type = AZSql.SQL_TYPE.MARIADB;
                        break;
                    case 'PromisePool':
                    case 'PromisePoolCluster':
                    case 'PoolNamespace':
                        // mysql
                        // this._sql_connection = connection_or_option as mysql2.Connection;
                        this._sql_pool = connection_or_option as mysql2plain.Pool|mysql2plain.PoolCluster;
                        this._connected = true;
                        this._option.sql_type = AZSql.SQL_TYPE.MYSQL;
                        break;
                }
            }
        }
    }

    clear(): AZSql {
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

    setQuery(query: string): AZSql {
        this._query = query;
        return this;
    }

    getQuery(_preapred: boolean = false): string|null {
        return this._query;
    }

    clearQuery(): AZSql {
        this._query = '';
        return this;
    }

    setModify(modify: boolean): AZSql {
        this._is_modify = modify;
        return this;
    }

    isModify(): boolean {
        return this._is_modify;
    }

    setDebug(debug: boolean): AZSql {
        this._is_debug = debug;
        return this;
    }

    isDebug(): boolean {
        return this._is_debug;
    }

    setPrepared(prepared: boolean): AZSql {
        this._is_prepared = prepared;
        return this;
    }

    isPrepared(): boolean {
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

    getQueryAndParams(): [string|null, Array<string>|null] {
        if (
            (
                this.option?.sql_type === AZSql.SQL_TYPE.SQLITE ||
                this.option?.sql_type === AZSql.SQL_TYPE.MYSQL ||
                this.option?.sql_type === AZSql.SQL_TYPE.MARIADB
            ) && 
            !this.isPrepared()
        ) {
            if (this._parameters === null) return [this._query, []];
            const keys: Array<string> = this._parameters?.getKeys();
            if (!keys || keys.length < 1) return [this._query, []];
            //
            let query: string = this._query as string;
            //
            const serialized_keys: string = keys.join('|');
            const regex: RegExp = new RegExp(`([^@])(${serialized_keys})([\r\n\\s\\t,)]|$)`);
            while (query.search(regex) > -1) {
                const match_array: RegExpMatchArray = query.match(regex) as RegExpMatchArray;
                const key: string|null = match_array && match_array.length > 2 ? match_array[2] : null;
                if (key == null) continue;
                const val: any = this._parameters?.get(key);
                if (typeof val !== 'undefined' && Array.isArray(val)) {
                    // let q_str: string = '';
                    val.forEach((col, idx, arr) => {
                        switch (typeof col) {
                            case 'number':
                            case 'boolean':
                                break;
                            default:
                                if ((col ?? null) === null) {
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
                    let val: any = this._parameters?.get(key);
                    switch (typeof val) {
                        case 'number':
                        case 'boolean':
                            break;
                        default:
                            if ((val ?? null) === null) {
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
        if (this._parameters === null) return [this._query, []];
        let query: string = this._query as string;
        const keys: Array<string> = this._parameters?.getKeys();
        //
        if (!keys || keys.length < 1) {
            return [this._query, []];
        }
        //
        const serialized_keys: string = keys.join('|');
        const param: Array<string> = new Array<string>();
        const regex: RegExp = new RegExp(`([^@])(${serialized_keys})([\r\n\\s\\t,)]|$)`);
        while (query.search(regex) > -1) {
            const match_array: RegExpMatchArray = query.match(regex) as RegExpMatchArray;
            const key: string|null = match_array && match_array.length > 2 ? match_array[2] : null;
            if (key == null) continue;
            const val: any = this._parameters?.get(key);
            if (typeof val !== 'undefined' && Array.isArray(val)) {
                let q_str: string = ',?'.repeat((val as Array<any>).length);
                q_str.length > 1 && (q_str = q_str.substring(1));
                query = query.replace(regex, `$1${q_str}$3`);
                for (let cnti: number = 0; cnti < (val as Array<any>).length; cnti++) {
                    param.push((val as Array<any>)[cnti]);
                }
            }
            else {
                query = query.replace(regex, '$1?$3');
                param.push(this._parameters?.get(key));
            }
        }
        return [query, param];
    }

    getReturnQuery(): string|null {
        if (!this.hasReturnParameters()) return null;
        const rtn_val: StringBuilder = new StringBuilder();
        rtn_val.append(`SELECT`);
        if (this._return_parameters instanceof AZData) {
            for (let cnti: number = 0; cnti < (this._return_parameters?.size()?? 0); cnti++) {
                rtn_val.append(' ');
                cnti > 0 && rtn_val.append(',');
                rtn_val.append(`${this._return_parameters?.getKey(cnti)}`);
            }
        }
        else {
            const keys = Object.keys(this._return_parameters!);
            for (let cnti: number = 0; cnti < keys.length; cnti++) {
                rtn_val.append(' ');
                cnti > 0 && rtn_val.append(',');
                rtn_val.append(`${keys[cnti]}`);
            }
        }
        return rtn_val.toString();
    }

    setParameters(parameters: AZData|object): AZSql {
        if (this._parameters === null) {
            this._parameters = new AZData();
        }
        else { 
            this._parameters.clear();
        }
        
        if (parameters instanceof AZData) {
            this._parameters = parameters;
        }
        else {
            const keys: Array<string> = Object.keys(parameters);
            for (let cnti: number = 0; cnti < keys.length; cnti++) {
                const key: string = keys[cnti];
                const val: any = (parameters as any)[key];
                this.addParameter(key, val);
            }
        }
        return this;
    }

    getParamters(): AZData|null {
        return this._parameters;
    }

    getParamter<Type>(key: string): Type {
        return this._parameters?.get(key) as Type;
    }

    addParameter(key: string, value: any): AZSql {
        this._parameters?.add(key, value);
        return this;
    }

    addParamters(paramters: AZData): AZSql {
        this._parameters?.add(paramters);
        return this;
    }

    clearParameters(): AZSql {
        this._parameters?.clear();
        return this;
    }

    removeParamters(): AZSql {
        this._parameters = null;
        return this;
    }

    hasParameters(): boolean {
        return this._parameters !== null && this._parameters instanceof AZData && this._parameters.size() > 0;
    }
    
    setReturnParameters(parameters: AZData|object): AZSql {
        // if (this._return_parameters === null) {
        //     this._return_parameters = new AZData();
        // }
        // else { 
        //     this._return_parameters.clear();
        // }
        if (this._return_parameters instanceof AZData) {
            this._return_parameters?.clear();
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

    getReturnParamters(): AZData|object|null {
        return this._return_parameters;
    }

    getReturnParamter<Type>(key: string): Type {
        if (this._return_parameters instanceof AZData) {
            return this._return_parameters?.get(key) as Type;
        }
        else {
            return (this._return_parameters as any)[key] as Type;
        }
    }

    addReturnParameter(key: string, value: any): AZSql {
        if (this._return_parameters instanceof AZData) {
            this._return_parameters?.add(key, value);
        }
        return this;
    }

    addReturnParamters(paramters: AZData): AZSql {
        if (this._return_parameters instanceof AZData) {
            this._return_parameters?.add(paramters);
        }
        return this;
    }

    updateReturnParamter(key: string|number, value: any): AZSql {
        if (this._return_parameters instanceof AZData) {
            this._return_parameters?.set(key, value);
        }
        else {
            (this._return_parameters as any)[key] = value;
        }
        return this;
    }

    clearReturnParameters(): AZSql {
        if (this._return_parameters instanceof AZData) {
            this._return_parameters?.clear();
        }
        return this;
    }

    removeReturnParamters(): AZSql {
        this._return_parameters = null;
        return this;
    }

    hasReturnParameters(): boolean {
        return this._return_parameters !== null && 
            (
                (this._return_parameters instanceof AZData && this._return_parameters.size() > 0) ||
                (typeof this._return_parameters === 'object' && Object.keys(this._return_parameters).length > 0)
            );
    }

    protected setResults(rows: Array<any>): AZSql {
        this._results = rows;
        return this;
    }

    protected addResult(row: any): AZSql {
        this._results === null && (this._results = new Array<any>());
        this._results.push(row);
        return this;
    }

    protected clearResults(): AZSql {
        this._results = null;
        return this;
    }

    protected setTransactionResults(rows: Array<any>): AZSql {
        this._transaction_result = rows;
        return this;
    }

    protected addTransactionResult(row: any): AZSql {
        this._transaction_result === null && (this._transaction_result = new Array<any>());
        this._transaction_result.push(row);
        return this;
    }

    clearTransactionResults(): AZSql {
        this._transaction_result = null;
        return this;
    }

    hasTransactionResults(): boolean {
        return this._transaction_result !== null && Array.isArray(this._transaction_result) && this._transaction_result.length > 0;
    }

    getTransactionResults(): Array<any>|null {
        return this._transaction_result;
    }

    getTransactionResult(idx: number): any {
        if (this._transaction_result === null || !Array.isArray(this._transaction_result)) return null;
        if (idx < 0 || idx >= this._transaction_result.length) return null;
        return this._transaction_result[idx];
    }

    hasResults(): boolean {
        return this._results !== null && Array.isArray(this._results) && this._results.length > 0;
    }

    getResults(): Array<any>|null{
        return this._results;
    }

    getResult(idx: number): any {
        if (this._results === null || !Array.isArray(this._results)) return null;
        if (idx < 0 || idx >= (this._results?.length?? 0)) return null;
        return this._results[idx];
    }

    setIdentity(identity: boolean): AZSql {
        this._identity = identity;
        return this;
    }

    isIdentity(): boolean {
        return this._identity;
    }

    setStoredProcedure(is_stored_procedure: boolean): AZSql {
        this._is_stored_procedure = is_stored_procedure;
        return this;
    }

    isStoredProcedure(): boolean {
        return this._is_stored_procedure;
    }

    async openAsync(): Promise<boolean> {
        switch (this._option?.sql_type) {
            case AZSql.SQL_TYPE.MARIADB:
                this._sql_connection = await new (mariadb.createConnection as any)({
                    host: this.option?.server,
                    user: this.option?.id,
                    password: this.option?.pw,
                    database: this.option?.catalog,
                });
                break;
            case AZSql.SQL_TYPE.MYSQL:
                this._sql_connection = await new (mysql2.createConnection as any)({
                    host: this.option?.server,
                    user: this.option?.id,
                    password: this.option?.pw,
                    database: this.option?.catalog,
                });
                break;
            case AZSql.SQL_TYPE.SQLITE:
                await new Promise((resolve: any, reject: any) => {
                    this._sql_connection = new sqlite3.Database(this.option?.server as string, (_res: any) => {
                        if (_res === null) resolve();
                        reject();
                    });
                });
                break;
        }
        this._connected = this._open_self = this._sql_connection !== null;
        return this._connected;
    }

    async closeAsync(): Promise<void> {
        if (this.isDebug() === true) console.log(`AZSql.closeAsync - inTransaction`);
        if (this.inTransaction || !this._open_self) return;
        switch (this._option?.sql_type) {
            case AZSql.SQL_TYPE.MARIADB:
                if (this.isDebug() === true) console.log(`AZSql.closeAsync - _sql_connection.release`);
                await (this._sql_connection as mariadb.PoolConnection).release();
                break;
            case AZSql.SQL_TYPE.MYSQL:
                if (this.isDebug() === true) console.log(`AZSql.closeAsync - _sql_connection.release`);
                (this._sql_connection as mysql2.PoolConnection).release();
                break;
            case AZSql.SQL_TYPE.SQLITE:
                await new Promise((resolve: any, reject: any) => {
                    if (this.isDebug() === true) console.log(`AZSql.closeAsync - _sql_connection.close`);
                    (this._sql_connection as sqlite3.Database).close((_res: any) => {
                        if (_res === null) resolve();
                        reject(_res);
                    })
                });
                break;
        }
        this._sql_connection = null;
        // this._connected = false;
        this._open_self = false;
    }

    async beginTran(_on_commit?: Function, _on_rollback?: Function): Promise<void> {
        if (this.isDebug() === true) console.log(`AZSql.beginTran`, this.option?.sql_type);
        if (this._in_transaction) throw new Error('Transaction in use');
        // if (this._transaction !== null) throw new Error('Transaction exists');
        !this._connected && await this.openAsync();
        switch (this.option?.sql_type) {
            case AZSql.SQL_TYPE.MARIADB:
                //
                this._sql_connection = await this._sql_pool_mariadb!.getConnection();
                this._open_self = true;
                if (this.isDebug() === true) console.log(`AZSql.beginTran - getConnection`);
                //
                await (this._sql_connection as mariadb.PoolConnection).beginTransaction()
                    .catch((err: Error) => {
                        this._in_transaction = false;
                    })
                    .then(() => {
                        this._in_transaction = true;
                        typeof _on_commit !== 'undefined' && (this._transaction_on_commit = _on_commit);
                        typeof _on_rollback !== 'undefined' && (this._transaction_on_rollback = _on_rollback);
                    });
                if (this.isDebug() === true) console.log(`AZSql.beginTran - inTransaction`, this.inTransaction);
                //
                break;
            case AZSql.SQL_TYPE.MYSQL:
                if (typeof (this._sql_pool as any)['commit'] === 'undefined') {
                    // if (typeof (this._sql_pool as any)['_cluster'] === 'undefined') {
                    if (this.instanceName === 'PromisePool') {
                    // if (typeof (this._sql_connection as any)['of'] === 'undefined') {
                        this._sql_pool = this._sql_pool as mysql2.Pool;
                        this._sql_connection = await this._sql_pool.getConnection();
                        this._open_self = true;
                        if (this.isDebug() === true) console.log(`AZSql.beginTran - getConnection`);
                    }
                    else {
                        this._sql_pool = this._sql_pool as mysql2plain.PoolCluster;
                        this._sql_connection = await new Promise((resolve) => {
                            (this._sql_pool as mysql2plain.PoolCluster)?.getConnection((err, conn) => {
                                if (err) throw err;
                                this._open_self = true;
                                resolve(conn);
                            });
                        });
                        if (this.isDebug() === true) console.log(`AZSql.beginTran - getConnection`);
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
                await (this._sql_connection as mysql2.Connection).beginTransaction()
                    .catch((err: Error) => {
                        this._in_transaction = false;
                    })
                    .then(() => {
                        this._in_transaction = true;
                        typeof _on_commit !== 'undefined' && (this._transaction_on_commit = _on_commit);
                        typeof _on_rollback !== 'undefined' && (this._transaction_on_rollback = _on_rollback);
                    });
                if (this.isDebug() === true) console.log(`AZSql.beginTran - inTransaction`, this.inTransaction);
                break;
        }
    }

    async commit(cb?: (res: any, err: any) => any): Promise<{res: Array<any>|null, err: any}> {
        const rtn_val = this.getTransactionResults();
        //
        let err: any = null;
        //
        try {
            if (this._in_transaction) {
                switch (this.option?.sql_type) {
                    case AZSql.SQL_TYPE.MARIADB:
                        await (this._sql_connection as mariadb.PoolConnection).commit();
                        break;
                    case AZSql.SQL_TYPE.MYSQL:
                        await (this._sql_connection as mysql2.Connection).commit();
                        break;
                }
                this._transaction_on_commit && this._transaction_on_commit();
            }
        }
        catch (e: any) {
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
        return {res: rtn_val, err};
    }

    async rollback(): Promise<void> {
        try {
            if (!this._in_transaction) throw new Error('Transaction not exists');
            switch (this.option?.sql_type) {
                case AZSql.SQL_TYPE.MARIADB:
                    if (this.isDebug() === true) console.log(`AZSql.rollback`);
                    await (this._sql_connection as mariadb.PoolConnection).rollback()
                        .catch(reason => {
                            if (this.isDebug() === true) console.log(`AZSql.rollback - rollback.catch`, reason);
                        });
                    break;
                    break;
                case AZSql.SQL_TYPE.MYSQL:
                    if (this.isDebug() === true) console.log(`AZSql.rollback`);
                    await (this._sql_connection as mysql2.Connection).rollback()
                        .catch(reason => {
                            if (this.isDebug() === true) console.log(`AZSql.rollback - rollback.catch`, reason);
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

    removeTran(): AZSql {
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

    async getAsync(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<any> {
        if (this.isDebug() === true) console.log(`AZSql.getAsync - query_or_id`, query_or_id, 'param_or_id', param_or_id, 'return_param_or_id', return_param_or_id, 'is_sp', is_sp);
        // const res: object = await this.getDataAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        // let rtn_val: any = null;
        // const keys: Array<string> = Object.keys(res);
        // keys.length > 0 && (rtn_val = (res as any)[keys[0]]);
        // return rtn_val;
        // const res: object|null = await this.getDataAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        const res = this.hasResults() ? this.getResults() as Array<any> : new Array<any>();
        //
        if (res.length < 1) return null;
        let rtn_val: any = null;
        const keys: Array<string> = Object.keys(res[0]);
        keys.length > 0 && (rtn_val = (res[0] as any)[keys[0]]);
        //
        this.inTransaction && this.addTransactionResult(rtn_val);
        //
        return rtn_val;
    }

    async getDataAsync(
        query_or_id?: string|boolean,
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<object|null> {
        if (this.isDebug() === true) console.log(`AZSql.getDataAsync - query_or_id`, query_or_id, 'param_or_id', param_or_id, 'return_param_or_id', return_param_or_id, 'is_sp', is_sp);
        // const res: Array<any> = await this.getListAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        // let rtn_val: object = {};
        // res.length > 0 && (rtn_val = res[0]);
        // return rtn_val;
        //
        // const res: Array<any> = await this.getListAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        const res = this.hasResults() ? this.getResults() as Array<any> : new Array<any>();
        //
        const rtn_val = res.length > 0 ? res[0] : null;
        //
        this.inTransaction && this.addTransactionResult(rtn_val);
        //
        return rtn_val;
    }

    async getListAsync(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<Array<any>> {
        if (this.isDebug() === true) console.log(`AZSql.getListAsync - query_or_id`, query_or_id, 'param_or_id', param_or_id, 'return_param_or_id', return_param_or_id, 'is_sp', is_sp);
        // const res: AZSql.Result = await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        // if (typeof res.rows === 'undefined' && typeof res.err !== 'undefined') throw res.err;
        // let rtn_val: Array<any> = new Array<any>();
        // typeof res.rows !== 'undefined' && (rtn_val = res.rows);
        // return rtn_val;
        await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        const res = this.hasResults() ? this.getResults() as Array<any> : new Array<any>();
        //
        this.inTransaction && this.addTransactionResult(res);
        //
        return res;
    }

    async executeAsync(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<number> {
        typeof is_sp !== 'undefined' && this.setStoredProcedure(is_sp);
        if (typeof return_param_or_id !== 'undefined') {
            if (typeof return_param_or_id !== 'boolean') {
                this.setReturnParameters(return_param_or_id as AZData|object);
            }
            else {
                this.setIdentity(return_param_or_id as boolean);
            }
        }
        if (typeof param_or_id !== 'undefined') {
            if (typeof param_or_id !== 'boolean') {
                this.setParameters(param_or_id as AZData|object);
            }
            else {
                this.setIdentity(param_or_id as boolean);
            }
        }
        if (typeof query_or_id !== 'undefined') {
            if (typeof query_or_id === 'string') {
                this.setQuery(query_or_id as string);
            }
            else {
                this.setIdentity(query_or_id as boolean);
            }
        }

        // let rtn_val: AZSql.Result = {} as AZSql.Result;
        let rtn_val: number = 0;

        if (this.isDebug() === true) console.log(`AZSql.executeAsync - connected`, this.connected);
        if (!this.connected) await this.openAsync();

        // const is_prepared: boolean = this.isPrepared || this.getParamters() !== null && ((this.getParamters() as AZData).size() > 0);
        const is_prepared: boolean = this.isPrepared();
        if (this.isDebug() === true) console.log(`AZSql.executeAsync - is_prepared`, is_prepared);

        if (this.inTransaction && !this.connected) return Promise.reject(new Error('Not connected'));
        if (this.connected) {
            try {
                let [query, params] = this.getQueryAndParams();
                // if (this.isDebug() === true) console.log(`AZSql.executeAsync - getQueryAndParams`, query, params);
                switch (this.option?.sql_type) {
                    case AZSql.SQL_TYPE.MARIADB:
                        if (is_prepared) {
                            let res: any = null;
                            let err: Error|null = null;
                            //
                            // const is_cluster = (this._sql_pool_mariadb as any).constructor.name === 'Cluster';
                            const is_cluster = this.instanceName === 'Cluster';
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!this.inTransaction || this._sql_connection === null) {
                                this._sql_pool_mariadb = this._sql_pool_mariadb as mariadb.Pool;
                                this._sql_connection = await this._sql_pool_mariadb.getConnection()
                                this._open_self = true;
                                if (this.isDebug() === true) console.log(`AZSql.executeAsync - getConnection`);
                            }

                            //
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute`, query, params);
                            [res, err] = await (this._sql_connection as mariadb.PoolConnection).execute(query as string, params)
                                .then((result: any) => {
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute.then`, result);
                                    return [ result, null ];
                                })
                                .catch(async (err: Error) => {
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute.catch`, err);
                                    this.inTransaction && await this.rollback();
                                    return [ null, err ];
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
                                    const header = res as { affectedRows: number, insertId: number, warningStatus: number };
                                    // rtn_val.affected = header.affectedRows;
                                    // rtn_val.identity = header.insertId;
                                    // rtn_val.header = header;
                                    rtn_val = this.isIdentity() ? Number(header.insertId) : header.affectedRows;
                                    //
                                    this.inTransaction && this.addTransactionResult(rtn_val);
                                }
                                //
                                if (this.isDebug() === true) console.log(`AZSql.executeAsync - isStoredProcedure`, this.isStoredProcedure());
                                if (this.isStoredProcedure()) {
                                    const return_query: string|null = this.getReturnQuery();
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - return_query`, return_query);
                                    if (return_query !== null) {
                                        let r_res: any = null;
                                        let r_err: Error|null = null;
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

                                        [r_res, r_err] = await (this._sql_connection as mariadb.PoolConnection).query(return_query as string)
                                            .then((result: any) => {
                                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - query.then`, result);
                                                return [ result, null ];
                                            })
                                            .catch(async (err: Error) => {
                                                this.inTransaction && await this.rollback();
                                                return [ null, err ];
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
                                                const return_params: any = (r_res as Array<any>)[0];
                                                const return_keys: Array<string> = Object.keys(return_params);
                                                for (let cnti: number = 0; cnti < return_keys.length; cnti++) {
                                                    const return_key: string = return_keys[cnti];
                                                    let return_val: any = return_params[return_key] as any;
                                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - return_key: return_val`, {return_key, return_val});
                                                    if (typeof return_val === 'bigint') return_val = Number(return_val);
                                                    this.updateReturnParamter(return_key, return_val);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            let res: any = null;
                            let err: Error|null = null;
                            //
                            // const is_cluster = typeof (this._sql_pool as any)['_cluster'] !== 'undefined';
                            const is_cluster = this.instanceName === 'PoolPromise';
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!this.inTransaction || this._sql_connection === null) {
                                this._sql_pool_mariadb = this._sql_pool_mariadb as mariadb.PoolCluster;
                                this._sql_connection = await this._sql_pool_mariadb.getConnection();
                                this._open_self = true;
                                if (this.isDebug() === true) console.log(`AZSql.executeAsync - getConnection`);
                            }
                            //
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute`, query, params);
                            [res, err] = await (this._sql_connection as mariadb.PoolConnection).query(query as string, params)
                                .then((result: any) => {
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute.then`, result);
                                    return [ result, null ];
                                })
                                .catch(async (err: Error) => {
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute.catch`, err);
                                    this.inTransaction && await this.rollback();
                                    return [ null, err ];
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
                                    const header = res as { affectedRows: number, insertId: number, warningStatus: number };
                                    // rtn_val.affected = header.affectedRows;
                                    // rtn_val.identity = header.insertId;
                                    // rtn_val.header = header;
                                    rtn_val = this.isIdentity() ? Number(header.insertId) : header.affectedRows;
                                    //
                                    this.inTransaction && this.addTransactionResult(rtn_val);
                                }
                                //
                                if (this.isDebug() === true) console.log(`AZSql.executeAsync - isStoredProcedure`, this.isStoredProcedure());
                                if (this.isStoredProcedure()) {
                                    const return_query: string|null = this.getReturnQuery();
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - return_query`, return_query);
                                    if (return_query !== null) {
                                        let r_res: any = null;
                                        let r_err: Error|null = null;
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

                                        [r_res, r_err] = await (this._sql_connection as mariadb.PoolConnection).query(return_query as string)
                                            .then((result: any) => {
                                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - query.then`, result);
                                                return [ result, null ];
                                            })
                                            .catch(async (err: Error) => {
                                                this.inTransaction && await this.rollback();
                                                return [ null, err ];
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
                                                const return_params: any = (r_res as Array<any>)[0];
                                                const return_keys: Array<string> = Object.keys(return_params);
                                                for (let cnti: number = 0; cnti < return_keys.length; cnti++) {
                                                    const return_key: string = return_keys[cnti];
                                                    let return_val: any = return_params[return_key] as any;
                                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - return_key: return_val`, {return_key, return_val});
                                                    if (typeof return_val === 'bigint') return_val = Number(return_val);
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
                            let res: any = null;
                            let err: Error|null = null;
                            //
                            // const is_cluster = typeof (this._sql_pool as any)['_cluster'] !== 'undefined';
                            const is_cluster = [ 'PromisePoolCluster', 'PoolNamespace', ].includes(this.instanceName ?? ''); // this.instanceName === 'PromisePoolCluster';
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!is_cluster) {
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool as mysql2.Pool;
                                    this._sql_connection = await this._sql_pool.getConnection();
                                    this._open_self = true;
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - getConnection`);
                                }

                                //
                                if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute`, query, params);
                                [res, err] = await (this._sql_connection as mysql2.Connection).execute(query as string, params)
                                    .then((result: any) => {
                                        if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute.then`, result);
                                        return [ result, null ];
                                    })
                                    .catch(async (err: Error) => {
                                        if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute.catch`, err);
                                        this.inTransaction && await this.rollback();
                                        return [ null, err ];
                                    });
                            }
                            else {
                                // this._sql_pool = this._sql_connection as mysql2plain.PoolCluster;
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool as mysql2.PoolCluster;
                                    this._sql_connection = await new Promise((resolve) => {
                                        this._sql_pool?.getConnection((err, conn) => {
                                            if (err) throw err;
                                            this._open_self = true;
                                            resolve(conn);
                                        });
                                    });
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - getConnection`);
                                }
                                //
                                [res, err] = await new Promise((resolve) => {
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute`, query, params);
                                    (this._sql_connection as mysql2plain.PoolConnection).execute(query as string, params, async (err, result) => {
                                        if (this.isDebug() === true) console.log(`AZSql.executeAsync - execute.callback`, err, result);
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

                                const rows: Array<any> = (res as Array<any>)[0];
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
                                    const header = ((res as Array<any>)[0] as mysql2.ResultSetHeader);
                                    // rtn_val.affected = header.affectedRows;
                                    // rtn_val.identity = header.insertId;
                                    // rtn_val.header = header;
                                    rtn_val = this.isIdentity() ? header.insertId : header.affectedRows;
                                    //
                                    this.inTransaction && this.addTransactionResult(rtn_val);
                                }
                                //
                                if (this.isStoredProcedure()) {
                                    const return_query: string|null = this.getReturnQuery();
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
                                        let r_res: any = null;
                                        let r_err: Error|null = null;
                                        if (!is_cluster) {
                                            [r_res, r_err] = await (this._sql_connection as mysql2.Connection).query(return_query as string)
                                                .then((result: any) => {
                                                    return [ result, null ];
                                                })
                                                .catch(async (err: Error) => {
                                                    this.inTransaction && await this.rollback();
                                                    return [ null, err ];
                                                });
                                        }
                                        else {
                                            [r_res, r_err] = await new Promise((resolve) => {
                                                (this._sql_connection as mysql2plain.PoolConnection).query(return_query as string, async (err, result) => {
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
                                            if (Array.isArray((r_res as Array<any>)[0])) {
                                                /**
                                                 * [
                                                 *  rows,
                                                 *  ColumnDefinitaion,
                                                 * ]
                                                 */
                                                const return_params: any = ((r_res as Array<any>)[0] as Array<any>)[0];
                                                const return_keys: Array<string> = Object.keys(return_params);
                                                for (let cnti: number = 0; cnti < return_keys.length; cnti++) {
                                                    const return_key: string = return_keys[cnti];
                                                    const return_val: any = return_params[return_key] as any;
                                                    this.updateReturnParamter(return_key, return_val);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            let res: any = null;
                            let err: Error|null = null;
                            //
                            // const is_cluster = typeof (this._sql_pool as any)['_cluster'] !== 'undefined';
                            const is_cluster = [ 'PromisePoolCluster', 'PoolNamespace', ].includes(this.instanceName ?? ''); // this.instanceName === 'PromisePoolCluster';
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - is_cluster`, is_cluster);
                            if (this.isDebug() === true) console.log(`AZSql.executeAsync - inTransaction`, this.inTransaction);
                            //
                            if (!is_cluster) {
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool as mysql2.Pool;
                                    this._sql_connection = await this._sql_pool.getConnection();
                                    this._open_self = true;
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - getConnection`);
                                }
                                //
                                [res, err] = await (this._sql_connection as mysql2.Connection).query(query as string, params)
                                    .then((result: any) => {
                                        return [ result, null ];
                                    })
                                    .catch(async (err: Error) => {
                                        this.inTransaction && await this.rollback();
                                        return [ null, err ];
                                    });
                            }
                            else {
                                if (!this.inTransaction || this._sql_connection === null) {
                                    this._sql_pool = this._sql_pool as mysql2plain.PoolCluster;
                                    this._sql_connection = await new Promise((resolve) => {
                                        this._sql_pool?.getConnection((err, conn) => {
                                            if (err) throw err;
                                            this._open_self = true;
                                            resolve(conn);
                                        });
                                    });
                                    if (this.isDebug() === true) console.log(`AZSql.executeAsync - getConnection`);
                                }
                                //
                                [res, err] = await new Promise((resolve) => {
                                    (this._sql_connection as mysql2plain.PoolConnection).query(query as string, params, async (err, result) => {
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
                                const rows: Array<any> = (res as Array<any>)[0];
                                if (Array.isArray(rows)) {
                                    rows.length > 1 && Array.isArray(rows[0]) && rows.pop();
                                    // rows[rows.length - 1] instanceof mysql2.ResultSetHeader && rows.pop();
                                    // rtn_val.rows = (res as Array<any>)[0] as Array<any>;
                                    this.setResults(rows);
                                    //
                                    // this.inTransaction && this.addTransactionResult(rows);
                                }
                                else {
                                    const header = ((res as Array<any>)[0] as mysql2.ResultSetHeader);
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
                                const return_query: string|null = this.getReturnQuery();
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
                                    let r_res: any = null;
                                    let r_err: Error|null = null;
                                    if (!is_cluster) {
                                        [r_res, r_err] = await (this._sql_connection as mysql2.Connection).query(return_query as string)
                                            .then((result: any) => {
                                                return [ result, null ];
                                            })
                                            .catch(async (err: Error) => {
                                                this.inTransaction && await this.rollback();
                                                return [ null, err ];
                                            });
                                    }
                                    else {
                                        [r_res, r_err] = await new Promise((resolve) => {
                                            (this._sql_connection as mysql2plain.PoolConnection).query(return_query as string, async (err, result) => {
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
                                        if (Array.isArray((r_res as Array<any>)[0])) {
                                            /**
                                             * [
                                             *  rows,
                                             *  ColumnDefinitaion,
                                             * ]
                                             */
                                            const return_params: any = ((r_res as Array<any>)[0] as Array<any>)[0];
                                            const return_keys: Array<string> = Object.keys(return_params);
                                            for (let cnti: number = 0; cnti < return_keys.length; cnti++) {
                                                const return_key: string = return_keys[cnti];
                                                const return_val: any = return_params[return_key] as any;
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
                        const [res, err]: any = await new Promise((resolve: any, _reject: any) => {
                            const stmt: sqlite3.Statement = (this._sql_connection as sqlite3.Database).prepare(query as string, (_res: any) => {
                                if (_res === null) {
                                    if (this.isIdentity() || this.isModify()) {
                                        stmt?.run(params, function (this: sqlite3.RunResult, err: Error) {
                                            if (err) {
                                                resolve([null, err]);
                                            }
                                            else {
                                                resolve([this as sqlite3.RunResult, null]);
                                            }
                                        });
                                        stmt?.finalize();
                                    }
                                    else {
                                        stmt?.all(params, function (err: Error, rows: Array<any>) {
                                            if (err) {
                                                resolve([null, err]);
                                            }
                                            else {
                                                resolve([rows, null]);
                                            }
                                        });
                                        stmt?.finalize();
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
                                rtn_val = this.isIdentity() && !this.isModify() ? (res as sqlite3.RunResult).lastID : (res as sqlite3.RunResult).changes;
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
            catch (e: any) {
                // rtn_val.err = e;
                throw e;
            }
            finally {
                if (this.isDebug() === true) console.log(`AZSql.executeAsync - finally`);
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

    get connected(): boolean {
        return this._connected;
    }

    get inTransaction(): boolean {
        return this._in_transaction;
    }

    get option(): AZSql.Option|null {
        return this._option;
    }

    get instanceName(): 'PoolPromise'|'Cluster'|'PromisePool'|'PromisePoolCluster'|'PoolNamespace'|null {
        return this._instance_name;
    }
}

export namespace AZSql {
    export interface Option {
        sql_type?: string;
        connection_string?: string;
        server?: string;
        port?: number;
        catalog?: string;
        id?: string;
        pw?: string;
    }

    export interface Result {
        affected?: number,
        identity?: number,
        header?: any,
        rows?: Array<any>,
        fileds?: Array<any>,
        err?: Error,
    }
    
    export const SQL_TYPE = {
        MYSQL: 'MYSQL',
        SQLITE: 'SQLITE',
        SQLITE_ANDROID: 'SQLITE_ANDROID',
        MSSQL: 'MSSQL',
        MARIADB: 'MARIADB',
        ORACLE: 'ORACLE'
    };
    export const _ATTRIBUTE_COLUMN = {
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

    export class Prepared extends AZSql {
        constructor(connection_or_option: AZSql.Option|mysql2.Connection|mysql2.Pool|mysql2plain.PoolConnection|mysql2.PoolConnection|mysql2plain.PoolCluster|mysql2.PoolCluster|mysql2plain.PoolNamespace|mysql2.PoolNamespace|sqlite3.Database) {
            super(connection_or_option);
            // this.setPrepared(true);
            this._is_prepared = true;
        }

        override setPrepared(prepared: boolean): Prepared {
            // this._is_prepared = prepared;
            return this;
        }
    }

    export class BQuery {
        protected _table_name: string|null = null;
        protected _prepared: boolean = false;
        protected _sql_set: AZList;
        protected _sql_where: Array<BQuery.Condition|BQuery.And|BQuery.Or>;
        protected _sql_select: string|null;

        constructor(table_name?: string, prepared: boolean = false) {
            typeof table_name !== 'undefined' && (this._table_name = table_name);
            this._prepared = prepared;
            this._sql_set = new AZList();
            this._sql_where = new Array<BQuery.Condition|BQuery.And|BQuery.Or>();
            this._sql_select = null;
        }

        isPrepared(): boolean {
            return this._prepared;
        }

        setPrepared(prepared: boolean): BQuery {
            this._prepared = prepared;
            return this;
        }

        clear(): BQuery {
            // this._table_name = null;
            this._prepared = false;
            this.clearSelect();
            this.clearSet();
            this.clearWhere();
            return this;
        }

        set(column: string|AZSql.BQuery.SetData, value?: any, value_type: BQuery.VALUETYPE = BQuery.VALUETYPE.VALUE): BQuery {
            if (column instanceof AZSql.BQuery.SetData) {
                return this.set(String(column.column), column.value, column.value_type);
            }
            else {
                const data: AZData = new AZData();
                data.attribute.add(BQuery.ATTRIBUTE.VALUE, value_type);
                data.add(column, value);
                this._sql_set.add(data);
            }
            return this;
        }

        clearSelect(): BQuery {
            this._sql_select = null;
            return this;
        }

        clearSet(): BQuery {
            this._sql_set.clear();
            return this;
        }

        where(column_or_data: BQuery.Condition|BQuery.And|BQuery.Or|string, value?: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE): BQuery {
            if (
                column_or_data instanceof BQuery.Condition ||
                column_or_data instanceof BQuery.And ||
                column_or_data instanceof BQuery.Or
            ) {
                this._sql_where.push(column_or_data);
                return this;
            }
            return this.where(new BQuery.Condition(column_or_data, value, where_type, value_type));
        }

        clearWhere(): BQuery {
            this._sql_where = new Array<BQuery.Condition|BQuery.And|BQuery.Or>();
            return this;
        }

        protected createQuery(query_type: BQuery.CREATE_QUERY_TYPE): string {
            let index: number = 0;
            const rtn_val: StringBuilder = new StringBuilder();
            switch (query_type) {
                case BQuery.CREATE_QUERY_TYPE.SELECT:
                    rtn_val.append(`SELECT${EOL}`);
                    rtn_val.append(` ${this._sql_select}${EOL}`);
                    rtn_val.append(`FROM ${this._table_name}${EOL}`);
                    this._sql_where.length > 0 && rtn_val.append(`WHERE${EOL}`);
                    for (let cnti: number = 0; cnti < this._sql_where.length; cnti++) {
                        const data: any = this._sql_where[cnti];
                        rtn_val.append(` `);
                        cnti > 0 && rtn_val.append(`AND `);
                        if (data instanceof BQuery.And) {
                            rtn_val.append((data as BQuery.And).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Or) {
                            rtn_val.append((data as BQuery.Or).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Condition) {
                            rtn_val.append((data as BQuery.Condition).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        rtn_val.append(`${EOL}`);
                    }
                    break;
                case BQuery.CREATE_QUERY_TYPE.INSERT:
                    rtn_val.append(`INSERT INTO ${this._table_name} (${EOL}`);
                    for (let cnti: number = 0; cnti < this._sql_set.size(); cnti++) {
                        const data: AZData|null = this._sql_set.get(cnti);
                        if (data !== null) {
                            rtn_val.append(` ${data.getKey(0)}${cnti < this._sql_set.size() - 1 ? ',' : ''}${EOL}`);
                        }
                    }
                    rtn_val.append(`)${EOL}`);
                    rtn_val.append(`VALUES (${EOL}`);
                    for (let cnti: number = 0; cnti < this._sql_set.size(); cnti++) {
                        const data: AZData|null = this._sql_set.get(cnti);
                        if (data !== null) {
                            rtn_val.append(' ');
                            if (data.attribute.get(BQuery.ATTRIBUTE.VALUE) === BQuery.VALUETYPE.QUERY) {
                                rtn_val.append(`${data.get(0)}`);
                            }
                            else {
                                const val: any = data.get(0);
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
                            rtn_val.append(`${EOL}`);
                        }
                    }
                    rtn_val.append(`)`);
                    break;
                case BQuery.CREATE_QUERY_TYPE.UPDATE:
                    rtn_val.append(`UPDATE ${this._table_name}${EOL}`);
                    this._sql_set.size() > 0 && rtn_val.append(`SET${EOL}`);
                    for (let cnti: number = 0; cnti < this._sql_set.size(); cnti++) {
                        const data: AZData|null = this._sql_set.get(cnti);
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
                                    const val: any = data.get(0);
                                    if (['number', 'boolean'].indexOf(typeof val) > -1) {
                                        rtn_val.append(`${data.getKey(0)}=${data.get(0)}`);
                                    }
                                    else {
                                        rtn_val.append(`${data.getKey(0)}='${data.get(0)}'`);
                                    }
                                }
                            }
                            cnti < (this._sql_set.size() - 1) && rtn_val.append(',');
                            rtn_val.append(`${EOL}`);
                        }
                    }
                    this._sql_where.length > 0 && rtn_val.append(`WHERE${EOL}`);
                    for (let cnti: number = 0; cnti < this._sql_where.length; cnti++) {
                        const data: any = this._sql_where[cnti];
                        rtn_val.append(` `);
                        cnti > 0 && rtn_val.append(`AND `);
                        if (data instanceof BQuery.And) {
                            rtn_val.append((data as BQuery.And).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Or) {
                            rtn_val.append((data as BQuery.Or).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Condition) {
                            rtn_val.append((data as BQuery.Condition).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        rtn_val.append(`${EOL}`);
                    }
                    break;
                case BQuery.CREATE_QUERY_TYPE.DELETE:
                    rtn_val.append(`DELETE FROM ${this._table_name}${EOL}`);
                    this._sql_where.length > 0 && rtn_val.append(`WHERE${EOL}`);
                    for (let cnti: number = 0; cnti < this._sql_where.length; cnti++) {
                        const data: any = this._sql_where[cnti];
                        rtn_val.append(` `);
                        cnti > 0 && rtn_val.append(`AND `);
                        if (data instanceof BQuery.And) {
                            rtn_val.append((data as BQuery.And).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Or) {
                            rtn_val.append((data as BQuery.Or).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        else if (data instanceof BQuery.Condition) {
                            rtn_val.append((data as BQuery.Condition).setPrepared(this.isPrepared()).toString(index, (_idx: number): void => { index = _idx; }));
                        }
                        rtn_val.append(`${EOL}`);
                    }
                    break;
            }
            return rtn_val.toString();
        }
        
        getQuery(query_type: BQuery.CREATE_QUERY_TYPE): string {
            return this.createQuery(query_type);
        }

        protected createPreparedParameters(): AZData {
            const rtn_val: AZData = new AZData();
            for (let cnti: number = 0; cnti < this._sql_set.size(); cnti++) {
                const data: AZData|null = this._sql_set.get(cnti);
                if (data !== null && data.attribute.get(BQuery.ATTRIBUTE.VALUE) === BQuery.VALUETYPE.VALUE) {
                    rtn_val.add(`@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}`, data.get(0));
                }
            }
            let index: number = 0;
            for (let cnti: number = 0; cnti < this._sql_where.length; cnti++) {
                const data: any = this._sql_where[cnti];
                if (data === null) continue;
                if (data instanceof BQuery.And) {
                    rtn_val.add((data as BQuery.And).setPrepared(this.isPrepared()).toAZData(index, (_idx: number): void => { index = _idx; }));
                }
                else if (data instanceof BQuery.Or) {
                    rtn_val.add((data as BQuery.Or).setPrepared(this.isPrepared()).toAZData(index, (_idx: number): void => { index = _idx; }));
                }
                else if (data instanceof BQuery.Condition) {
                    rtn_val.add((data as BQuery.Condition).setPrepared(this.isPrepared()).toAZData(index, (_idx: number): void => { index = _idx; }));
                }
            }
            return rtn_val;
        }

        getPreparedParameters(): AZData {
            return this.createPreparedParameters();
        }
    }

    export namespace BQuery {
        export enum WHERETYPE {
            GREATER_THAN = '>',
            GREATER_THAN_OR_EQUAL = '>=',
            GT = '>',
            GTE = '>=',
            LESS_THAN = '<',
            LESS_THAN_OR_EQUAL = '<=',
            LT = '<',
            LTE = '<=',
            EQUAL = '=',
            NOT_EQUAL = '<>',
            EQ = '=',
            NE = '<>',
            BETWEEN = 'BETWEEN',
            IN = 'IN',
            NOT_IN = 'NOT IN',
            NIN = 'NOT IN',
            LIKE = 'LIKE',
        };

        export enum VALUETYPE {
            VALUE = 'VALUE',
            QUERY = 'QUERY',
        };

        export enum CREATE_QUERY_TYPE {
            INSERT,
            UPDATE,
            DELETE,
            SELECT,
        };

        export const ATTRIBUTE = {
            VALUE: 'value',
            WHERE: 'where',
        }

        export class SetData {
            private _column: string|null = null;
            private _value: string|null = null;
            private _value_type: BQuery.VALUETYPE = BQuery.VALUETYPE.VALUE;

            constructor(column?: string, value?: string, value_type?: BQuery.VALUETYPE) {
                typeof column !== 'undefined' && (this._column = column);
                typeof value !== 'undefined' && (this._value = value);
                typeof value_type !== 'undefined' && (this._value_type = value_type);
            }

            static init(): SetData {
                return new SetData();
            }

            set(column: string, value: string, value_type?: BQuery.VALUETYPE): void {
                this._column = column;
                this._value = value;
                typeof value_type !== 'undefined' && (this._value_type = value_type);
            }

            getQuery(): string {
                let rtn_val: string = '';
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

            get column(): string|null {
                return this._column;
            }

            set column(column) {
                this._column = column;
            }

            get value(): string|null {
                return this._value;
            }

            set value(value) {
                this._value = value;
            }

            get value_type(): BQuery.VALUETYPE {
                return this._value_type;
            }

            set value_type(value_type: BQuery.VALUETYPE) {
                this._value_type = value_type;
            }
        }

        export class Condition {
            private _column: string|null = null;
            private _value: any;
            private _where_type: BQuery.WHERETYPE = BQuery.WHERETYPE.EQUAL;
            private _value_type: BQuery.VALUETYPE = BQuery.VALUETYPE.VALUE;
            private _prepared: boolean = false;

            constructor(column?: string, value?: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE) {
                typeof column !== 'undefined' && typeof value !== 'undefined' &&
                    this.set(column, value, where_type, value_type);
            }

            set(column: string, value: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE): void {
                this._column = column;
                this._value = value;
                typeof where_type !== 'undefined' && (this._where_type = where_type);
                typeof value_type !== 'undefined' && (this._value_type = value_type);
            }

            setPrepared(prepare: boolean): Condition {
                this._prepared = prepare;
                return this;
            }

            isPrepared(): boolean {
                return this._prepared;
            }

            toAZData(index: number, _cb: Function|null = null): AZData {
                ++index;
                const rtn_val: AZData = new AZData();
                if (!this.isPrepared()) return rtn_val;
                switch (this._value_type) {
                    case BQuery.VALUETYPE.VALUE:
                        switch (this._where_type) {
                            case BQuery.WHERETYPE.BETWEEN:
                                if (Array.isArray(this._value)) {
                                    rtn_val.add(
                                        `@${this._column?.replace(/\./, '___')}_where_${index}_between_1`,
                                        (this._value as Array<any>).length > 0 ? 
                                            (this._value as Array<any>)[0] :
                                            null    
                                    );
                                    rtn_val.add(
                                        `@${this._column?.replace(/\./, '___')}_where_${index}_between_2`,
                                        (this._value as Array<any>).length > 1 ? 
                                            (this._value as Array<any>)[1] :
                                            null    
                                    );
                                }
                                else {
                                    rtn_val.add(`@${this._column?.replace(/\./, '___')}_where_${index}_between_1`, this._value);
                                    // rtn_val.add(`@${this._column?.replace(/\./, '___')}_where_${index}_between_2`, this._value);
                                }
                                break;
                            case BQuery.WHERETYPE.IN:
                            case BQuery.WHERETYPE.NIN:
                            case BQuery.WHERETYPE.NOT_IN:
                                if (Array.isArray(this._value)) {
                                    for (let cnti: number = 0; cnti < (this._value as Array<any>).length; cnti++) {
                                        const data: any = (this._value as Array<any>)[cnti];
                                        rtn_val.add(`@${this._column?.replace(/\./, '___')}_where_${index}_in_${cnti + 1}`, data);
                                    }
                                }
                                else {
                                    rtn_val.add(`@${this._column?.replace(/\./, '___')}_where_${index}_in_1`, this._value);
                                }
                                break;
                            default:
                                rtn_val.add(`@${this._column?.replace(/\./, '___')}_where_${index}`, this._value);
                                break;
                        }
                        break;
                }
                _cb && _cb(index);
                return rtn_val;
            }

            toString(index: number, _cb: Function|null = null): string {
                ++index;
                const rtn_val: StringBuilder = new StringBuilder();
                switch (this._value_type) {
                    case BQuery.VALUETYPE.QUERY:
                        switch (this._where_type) {
                            case BQuery.WHERETYPE.BETWEEN:
                                if (Array.isArray(this._value)) {
                                    const val1: any = (this._value as Array<any>).length > 0 ? (this._value as Array<any>)[0] : null;
                                    const val2: any = (this._value as Array<any>).length > 1 ? (this._value as Array<any>)[1] : null;
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
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${(this._value as Array<any>).join(',')})`);
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
                                    let val1: any = null;
                                    let val2: any = null;
                                    if (this._prepared) {
                                        val1 = `@${this._column?.replace(/\./, '___')}_where_${index}_between_1`;
                                        val2 = `@${this._column?.replace(/\./, '___')}_where_${index}_between_2`;
                                    }
                                    else {
                                        val1 = typeof this._value === 'string' ? `'${this._value}'` : this._value;
                                        val2 = typeof this._value === 'string' ? `'${this._value}'` : this._value;
                                    }
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} ${val1} AND ${val2}`);
                                }
                                else {
                                    let val: any = null;
                                    if (this._prepared) {
                                        val = `@${this._column?.replace(/\./, '___')}_where_${index}_between_1`;
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
                                        const vals: Array<string> = new Array<string>();
                                        for (let cnti: number = 0; cnti < (this._value as Array<any>).length; cnti++) {
                                            vals.push(`@${this._column?.replace(/\./, '___')}_where_${index}_in_${cnti + 1}`);
                                        }
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${vals.join(',')})`);
                                    }
                                    else {
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${(this._value as Array<any>).join(',')})`);
                                    }
                                }
                                else {
                                    if (this._prepared) {
                                        const vals: Array<string> = new Array<string>();
                                        vals.push(`@${this._column?.replace(/\./, '___')}_where_${index}_in_1`);
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${vals.join(',')})`);
                                    }
                                    else {
                                        rtn_val.append(`${this._column} ${this._where_type.valueOf()} (${(this._value as Array<any>).join(',')})`);
                                    }
                                }
                                break;
                            default:
                                if (this._prepared) {
                                    rtn_val.append(`${this._column} ${this._where_type.valueOf()} @${this._column?.replace(/\./, '___')}_where_${index}`);
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

        export class And {
            private _ands: Array<Condition|And|Or>;
            private _prepared: boolean = false;

            constructor(...args: Array<Condition|And|Or>) {
                this._ands = new Array<Condition|And|Or>();
                this._ands.push(...args);
            }

            add(...args: Array<Condition|And|Or>): And {
                this._ands.push(...args);
                return this;
            }

            setPrepared(prepared: boolean): And {
                this._prepared = prepared;
                return this;
            }

            isPrepared(): boolean {
                return this._prepared;
            }

            count(): number {
                return this._ands.length;
            }

            toAZData(index: number, _cb: Function|null = null): AZData {
                const rtn_val: AZData = new AZData();
                if (!this.isPrepared()) return rtn_val;
                for (let cnti: number = 0; cnti < this._ands.length; cnti++) {
                    const data: any = this._ands[cnti];
                    if (data instanceof And) {
                        rtn_val.add((data as And).setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.add((data as Or).setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.add((data as Condition).setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                }
                return rtn_val;
            }

            toString(index: number, _cb: Function|null = null): string {
                const rtn_val: StringBuilder = new StringBuilder();
                rtn_val.append('(');
                for (let cnti: number = 0; cnti < this._ands.length; cnti++) {
                    const data: any = this._ands[cnti];
                    rtn_val.append(EOL);
                    cnti < 1 && rtn_val.append(`AND `);
                    if (data instanceof And) {
                        rtn_val.append((data as And).setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.append((data as Or).setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.append((data as Condition).setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                }
                rtn_val.append(EOL);
                rtn_val.append('(');
                return rtn_val.toString();
            }
        }

        export class Or {
            private _ors: Array<Condition|And|Or>;
            private _prepared: boolean = false;

            constructor(...args: Array<Condition|And|Or>) {
                this._ors = new Array<Condition|And|Or>();
                this._ors.push(...args);
            }

            add(...args: Array<Condition|And|Or>): Or {
                this._ors.push(...args);
                return this;
            }

            setPrepared(prepared: boolean): Or {
                this._prepared = prepared;
                return this;
            }

            isPrepared(): boolean {
                return this._prepared;
            }

            count(): number {
                return this._ors.length;
            }

            toAZData(index: number, _cb: Function|null = null): AZData {
                const rtn_val: AZData = new AZData();
                if (!this.isPrepared()) return rtn_val;
                for (let cnti: number = 0; cnti < this._ors.length; cnti++) {
                    const data: any = this._ors[cnti];
                    if (data instanceof And) {
                        rtn_val.add((data as And).setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.add((data as Or).setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.add((data as Condition).setPrepared(this.isPrepared()).toAZData(index, _cb));
                    }
                }
                return rtn_val;
            }

            toString(index: number, _cb: Function|null = null): string {
                const rtn_val: StringBuilder = new StringBuilder();
                rtn_val.append('(');
                for (let cnti: number = 0; cnti < this._ors.length; cnti++) {
                    const data: any = this._ors[cnti];
                    rtn_val.append(EOL);
                    cnti < 1 && rtn_val.append(`AND `);
                    if (data instanceof And) {
                        rtn_val.append((data as And).setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Or) {
                        rtn_val.append((data as Or).setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                    else if (data instanceof Condition) {
                        rtn_val.append((data as Condition).setPrepared(this.isPrepared()).toString(index, _cb));
                    }
                }
                rtn_val.append(EOL);
                rtn_val.append(')');
                return rtn_val.toString();
            }
        }
    }
    

    export class Basic extends AZSql.BQuery {
        private _azsql: AZSql|null = null;
        constructor(table_name: string, azsql_or_option?: AZSql|AZSql.Option|mysql2.Connection|mysql2.Pool|mysql2plain.PoolConnection|mysql2.PoolConnection|mysql2plain.PoolCluster|mysql2.PoolCluster|mysql2plain.PoolNamespace|mysql2.PoolNamespace|sqlite3.Database, prepared?: boolean) {
            super(table_name, prepared);
            if (typeof azsql_or_option !== 'undefined') {
                if (azsql_or_option instanceof AZSql) {
                    this._azsql = azsql_or_option as AZSql;
                }
                else {
                    this._azsql = new AZSql(azsql_or_option);
                }
            }
        }

        override setPrepared(prepared: boolean): AZSql.Basic {
            super.setPrepared(prepared);
            return this;
        }

        override clear(): AZSql.Basic {
            super.clear();
            return this;
        }

        override set(column: string|AZSql.BQuery.SetData, value?: any, value_type: BQuery.VALUETYPE = BQuery.VALUETYPE.VALUE): AZSql.Basic {
            super.set(column, value, value_type);
            return this;
        }

        override clearSet(): BQuery {
            super.clearSet();
            return this;
        }

        override where(column_or_data: BQuery.Condition|BQuery.And|BQuery.Or|string, value?: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE): AZSql.Basic {
            super.where(column_or_data, value, where_type, value_type);
            return this;
        }

        override clearWhere(): AZSql.Basic {
            this._sql_where = new Array<BQuery.Condition|BQuery.And|BQuery.Or>();
            return this;
        }

        async doSelectAsync(select: string = '*'): Promise<Array<any>> {
            if (typeof this._azsql === 'undefined') throw new Error('AZSql is not defined');
            this._sql_select = select;
            // return await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.SELECT), this.getPreparedParameters());
            // const res: AZSql.Result = await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.SELECT), this.getPreparedParameters());
            // if (typeof res.rows === 'undefined' && typeof res.err !== 'undefined') throw res.err;
            // let rtn_val: Array<any> = new Array<any>();
            // typeof res.rows !== 'undefined' && (rtn_val = res.rows);
            // return rtn_val;
            //
            const cur_prepared = (this._azsql as AZSql).isPrepared();
            const cur_identity: boolean = (this._azsql as AZSql).isIdentity();
            //
            (this._azsql as AZSql)
                .setIdentity(false)
                .setPrepared(this.isPrepared());
            //
            const rtn_val: Array<any> =  await (this._azsql as AZSql).getListAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.SELECT), this.getPreparedParameters());
            //
            (this._azsql as AZSql)
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }

        async doInsertAsync(req_identity: boolean = false): Promise<number> {
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
            const cur_prepared = (this._azsql as AZSql).isPrepared();
            const cur_identity: boolean = (this._azsql as AZSql).isIdentity();
            //
            (this._azsql as AZSql)
                .setIdentity(req_identity)
                .setPrepared(this.isPrepared());
            //
            const rtn_val: number = await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT), this.getPreparedParameters());
            //
            (this._azsql as AZSql)
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }

        async doUpdateAsync(_require_where: boolean = true): Promise<number> {
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
            const cur_prepared = (this._azsql as AZSql).isPrepared();
            const cur_identity: boolean = (this._azsql as AZSql).isIdentity();
            //
            (this._azsql as AZSql)
                .setIdentity(false)
                .setPrepared(this.isPrepared());
            //
            const rtn_val: number = await (this._azsql as AZSql).setModify(true).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE), this.getPreparedParameters());
            //
            (this._azsql as AZSql)
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }

        async doDeleteAsync(_require_where: boolean = true): Promise<number> {
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
            const cur_prepared = (this._azsql as AZSql).isPrepared();
            const cur_identity: boolean = (this._azsql as AZSql).isIdentity();
            //
            (this._azsql as AZSql)
                .setIdentity(false)
                .setPrepared(this.isPrepared());
            //
            const rtn_val: number = await (this._azsql as AZSql).setModify(true).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE), this.getPreparedParameters());
            //
            (this._azsql as AZSql)
                .setIdentity(cur_identity)
                .setPrepared(cur_prepared);
            return rtn_val;
        }
    }
}
