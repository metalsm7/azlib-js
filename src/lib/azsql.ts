import { EOL } from 'os';
import * as mysql2 from 'mysql2/promise';
import * as sqlite3 from 'sqlite3';
// import { AZMap } from './azmap';
import { AZData } from './azdata';
import { AZList } from './azlist';
import { StringBuilder } from './stringbuilder';

export class AZSql {
    protected _option: AZSql.Option = {} as AZSql.Option;
    protected _connected: boolean = false;
    protected _open_self: boolean = false;
    
    protected _query: string|null = null;
    protected _parameters: AZData|null = null;
    protected _return_parameters: AZData|null = null;
    private _identity: boolean = false;

    protected _in_transaction: boolean = false;
    protected _transaction: any = null;
    protected _transaction_result: AZData|null = null;
    protected _transaction_on_commit: Function|null = null;
    protected _transaction_on_rollback: Function|null = null;

    protected _is_stored_procedure: boolean = false;

    protected _sql_connection: mysql2.Connection|mysql2.Pool|sqlite3.Database|null = null;

    protected _sql_pool: mysql2.Pool|null = null;

    protected _is_prepared: boolean = false;

    constructor(connection_or_option: AZSql.Option|mysql2.Connection|mysql2.Pool|sqlite3.Database) {
        // console.log(connection_or_option);
        // console.log(typeof connection_or_option);
        if ((connection_or_option as AZSql.Option)['sql_type'] !== undefined) {
            this._option = connection_or_option as AZSql.Option;
        }
        else {
            if (connection_or_option instanceof sqlite3.Database) {
                this._sql_connection = connection_or_option as sqlite3.Database;
                this._connected = true;
                this._option.sql_type = AZSql.SQL_TYPE.SQLITE;
            }
            else {
                this._sql_connection = connection_or_option as mysql2.Connection;
                this._connected = true;
                this._option.sql_type = AZSql.SQL_TYPE.MYSQL;
            }
        }
    }

    clear(): AZSql {
        this.setIsStoredProcedure(false);
        // this.setIdentity(false);
        this.clearQuery();
        this.clearParameters();
        this.clearReturnParameters();
        this.removeTran();
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

    setPrepared(prepared: boolean): AZSql {
        this._is_prepared = prepared;
        return this;
    }

    get isPrepared(): boolean {
        return this._is_prepared;
    }

    getPreapredQueryAndParams(): [string|null, Array<string>|null] {
        // console.log(`getPreparedQueryAndParams - size:${this._parameters?.size()}`);
        if (this._parameters === null) return [this._query, []];
        let query: string = this._query as string;
        const param: Array<string> = new Array<string>();
        const keys: Array<string> = this._parameters?.getKeys();
        const serialized_keys: string = keys.join('|');
        const regex: RegExp = new RegExp(`([^@])(${serialized_keys})([\r\n\\s\\t,)]|$)`);
        // console.log(`getPreparedQueryAndParams - serialized_keys:${serialized_keys} - search:${query.search(regex)}`);
        while (query.search(regex) > -1) {
            const match_array: RegExpMatchArray = query.match(regex) as RegExpMatchArray;
            const key: string|null = match_array && match_array.length > 2 ? match_array[2] : null;
            // console.log(`getPreparedQueryAndParams - key:${key}`);
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
    

    setReturnParameters(parameters: AZData|object): AZSql {
        if (this._return_parameters === null) {
            this._return_parameters = new AZData();
        }
        else { 
            this._return_parameters.clear();
        }
        
        if (parameters instanceof AZData) {
            this._return_parameters = parameters;
        }
        else {
            const keys: Array<string> = Object.keys(parameters);
            for (let cnti: number = 0; cnti < keys.length; cnti++) {
                const key: string = keys[cnti];
                const val: any = (parameters as any)[key];
                this.addReturnParameter(key, val);
            }
        }
        return this;
    }

    getReturnParamters(): AZData|null {
        return this._return_parameters;
    }

    getReturnParamter<Type>(key: string): Type {
        return this._return_parameters?.get(key) as Type;
    }

    addReturnParameter(key: string, value: any): AZSql {
        this._return_parameters?.add(key, value);
        return this;
    }

    addReturnParamters(paramters: AZData): AZSql {
        this._return_parameters?.add(paramters);
        return this;
    }

    updateReturnParamter(key: string|number, value: any): AZSql {
        this._return_parameters?.set(key, value);
        return this;
    }

    clearReturnParameters(): AZSql {
        this._return_parameters?.clear();
        return this;
    }

    removeReturnParamters(): AZSql {
        this._return_parameters = null;
        return this;
    }

    setIdentity(identity: boolean): AZSql {
        this._identity = identity;
        return this;
    }

    getIdentity(): boolean {
        return this._identity;
    }

    setIsStoredProcedure(is_stored_procedure: boolean): AZSql {
        this._is_stored_procedure = is_stored_procedure;
        return this;
    }

    getIsStoredProcedure(): boolean {
        return this._is_stored_procedure;
    }

    async openAsync(): Promise<boolean> {
        switch (this._option?.sql_type) {
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
                    this._sql_connection = new sqlite3.Database(this.option?.server as string, (_res) => {
                        if (_res === null) resolve();
                        reject();
                    });
                });
                break;
        }
        this._connected = this._open_self = this._sql_connection !== null;
        // console.log(`openAsync - connected:${this.connected} / connection:${this._sql_connection} / sql_type:${this._option?.sql_type}`);
        return this._connected;
    }

    async closeAsync(): Promise<void> {
        // console.log(`closeAsync.BEGIN - sql_type:${this._option?.sql_type}`);
        if (this.inTransaction || !this._open_self) return;
        switch (this._option?.sql_type) {
            case AZSql.SQL_TYPE.MYSQL:
                await (this._sql_connection as mysql2.Connection).end();
                break;
            case AZSql.SQL_TYPE.SQLITE:
                await new Promise((resolve: any, reject: any) => {
                    (this._sql_connection as sqlite3.Database).close((_res) => {
                        // console.log(`closeAsync.close - _res:${_res}`);
                        if (_res === null) resolve();
                        reject(_res);
                    })
                });
                break;
        }
        this._sql_connection = null;
        this._connected = false;
        this._open_self = false;
        // console.log(`closeAsync - connected:${this.connected} / connection:${this._sql_connection} / sql_type:${this._option?.sql_type}`);
    }

    async beginTran(_on_commit?: Function, _on_rollback?: Function): Promise<void> {
        if (this._in_transaction) throw new Error('Transaction in use');
        if (this._transaction !== null) throw new Error('Transaction exists');
        !this._connected && await this.openAsync();
        switch (this.option?.sql_type) {
            case AZSql.SQL_TYPE.MYSQL:
                if (typeof (this._sql_connection as any)['commit'] === 'undefined') {
                    this._sql_pool = this._sql_connection as mysql2.Pool;
                    this._sql_connection = await this._sql_pool.getConnection();
                }
                this._transaction = (this._sql_connection as mysql2.Connection).beginTransaction();
                this._transaction
                    .catch((err: Error) => {
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

    async commit(): Promise<void> {
        try {
            if (this._in_transaction) {
                switch (this.option?.sql_type) {
                    case AZSql.SQL_TYPE.MYSQL:
                        await (this._sql_connection as mysql2.Connection).commit();
                        break;
                }
                this._transaction_on_commit && this._transaction_on_commit();
            }
        }
        catch (e) {
            throw e;
        }
        finally {
            this.removeTran();
            await this.closeAsync();
        }
    }

    async rollback(): Promise<void> {
        try {
            if (!this._in_transaction) throw new Error('Transaction not exists');
            switch (this.option?.sql_type) {
                case AZSql.SQL_TYPE.MYSQL:
                    await (this._sql_connection as mysql2.Connection).rollback();
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

    async getAsync(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<any> {
        const res: object = await this.getDataAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        let rtn_val: any = null;
        const keys: Array<string> = Object.keys(res);
        keys.length > 0 && (rtn_val = (res as any)[keys[0]]);
        return rtn_val;
    }

    async getDataAsync(
        query_or_id?: string|boolean,
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<object> {
        const res: Array<any> = await this.getListAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        let rtn_val: object = {};
        res.length > 0 && (rtn_val = res[0]);
        return rtn_val;
    }

    async getListAsync(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<Array<any>> {
        const res: AZSql.Result = await this.executeAsync(query_or_id, param_or_id, return_param_or_id, is_sp);
        if (typeof res.rows === 'undefined' && typeof res.err !== 'undefined') throw res.err;
        let rtn_val: Array<any> = new Array<any>();
        typeof res.rows !== 'undefined' && (rtn_val = res.rows);
        return rtn_val;
    }

    async executeAsync(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|object|boolean,
        return_param_or_id?: AZData|object|boolean,
        is_sp?: boolean
    ): Promise<AZSql.Result> {
        typeof is_sp !== 'undefined' && this.setIsStoredProcedure(is_sp);
        if (typeof return_param_or_id !== 'undefined') {
            // console.debug(`type - return_param_or_id:${typeof return_param_or_id}`);
            if (typeof return_param_or_id !== 'boolean') {
                this.setReturnParameters(return_param_or_id as AZData|object);
            }
            else {
                this.setIdentity(return_param_or_id as boolean);
            }
        }
        if (typeof param_or_id !== 'undefined') {
            // console.debug(`type - param_or_id:${typeof param_or_id}`);
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

        let rtn_val: AZSql.Result = {} as AZSql.Result;

        if (!this.connected) await this.openAsync();

        const is_prepared: boolean = this.isPrepared || this.getParamters() !== null && ((this.getParamters() as AZData).size() > 0);

        if (this.inTransaction && !this.connected) return Promise.reject(new Error('Not connected'));
        if (this.connected) {
            try {
                switch (this.option?.sql_type) {
                    case AZSql.SQL_TYPE.MYSQL:
                        if (is_prepared) {
                            const [query, params] = this.getPreapredQueryAndParams();
                            // console.log(`query:`);
                            // console.log(query);
                            // console.log(`params:`);
                            // console.log(params);
                            const [res, err] = await (this._sql_connection as mysql2.Connection).execute(query as string, params)
                                .then((res: any) => {
                                    return [ res, null ];
                                })
                                .catch(async (err: Error) => {
                                    this.inTransaction && await this.rollback();
                                    return [ null, err ];
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
                                if (Array.isArray((res as Array<any>)[0])) {
                                    /**
                                     * [
                                     *  rows,
                                     *  ColumnDefinitaion,
                                     * ]
                                     */
                                    rtn_val.rows = (res as Array<any>)[0] as Array<any>;
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
                                    rtn_val.affected = header.affectedRows;
                                    rtn_val.identity = header.insertId;
                                    rtn_val.header = header;
                                }
                            }
                        }
                        else {
                            const [res, err] = await (this._sql_connection as mysql2.Connection).query(this._query as string)
                                .then((res: any) => {
                                    return [ res, null ];
                                })
                                .catch(async (err: Error) => {
                                    this.inTransaction && await this.rollback();
                                    return [ null, err ];
                                });
                            if (err) {
                                rtn_val.err = err;
                            }
                            else {
                                if (Array.isArray((res as Array<any>)[0])) {
                                    rtn_val.rows = (res as Array<any>)[0] as Array<any>;
                                }
                                else {
                                    const header = ((res as Array<any>)[0] as mysql2.ResultSetHeader);
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
                            const [res, err] = await new Promise((resolve: any, _reject: any) => {
                                const stmt: sqlite3.Statement = (this._sql_connection as sqlite3.Database).prepare(query as string, (_res) => {
                                    if (_res === null) {
                                        if (this.getIdentity()) {
                                            stmt?.run(params, function (err: Error) {
                                                if (err) {
                                                    resolve([null, err]);
                                                }
                                                else {
                                                    resolve([this as sqlite3.RunResult, null]);
                                                }
                                            });
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
                                    rtn_val.affected = (res as sqlite3.RunResult).changes;
                                    rtn_val.identity = (res as sqlite3.RunResult).lastID;
                                }
                            }
                        }
                        else {
                            const [res, err] = await new Promise((resolve: any, _reject: any) => {
                                if (this.getIdentity()) {
                                    (this._sql_connection as sqlite3.Database).run(this._query as string, function (err: Error) {
                                        if (err) {
                                            resolve([null, err]);
                                        }
                                        else {
                                            resolve([this as sqlite3.RunResult, null]);
                                        }
                                    });
                                }
                                else {
                                    (this._sql_connection as sqlite3.Database).all(this._query as string, (err: Error, rows: Array<any>) => {
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
                                    rtn_val.affected = (res as sqlite3.RunResult).changes;
                                    rtn_val.identity = (res as sqlite3.RunResult).lastID;
                                }
                            }
                        }
                        break;
                }
            }
            catch (e: any) {
                rtn_val.err = e;
            }
            finally {
                await this.closeAsync()
                    .catch((_err) => {
                        // console.log(`finally - err:${_err}`);
                        rtn_val.err = _err;
                    });
            }
        }
        // console.log(`return`);
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
        constructor(connection_or_option: AZSql.Option|mysql2.Connection|mysql2.Pool|sqlite3.Database) {
            super(connection_or_option);
            this.setPrepared(true);
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

        setIsPrepared(prepared: boolean): BQuery {
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
        constructor(table_name: string, azsql_or_option?: AZSql|AZSql.Option, prepared?: boolean) {
            super(table_name, prepared);
            if (typeof azsql_or_option !== 'undefined') {
                if (azsql_or_option instanceof AZSql) {
                    this._azsql = azsql_or_option as AZSql;
                }
                else {
                    this._azsql = new AZSql(azsql_or_option as AZSql.Option);
                }
            }
        }

        override setIsPrepared(prepared: boolean): AZSql.Basic {
            super.setIsPrepared(prepared);
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
            const res: AZSql.Result = await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.SELECT), this.getPreparedParameters());
            if (typeof res.rows === 'undefined' && typeof res.err !== 'undefined') throw res.err;
            let rtn_val: Array<any> = new Array<any>();
            typeof res.rows !== 'undefined' && (rtn_val = res.rows);
            return rtn_val;
        }

        async doInsertAsync(_get_identity: boolean = false): Promise<AZSql.Result> {
            if (typeof this._azsql === 'undefined') {
                return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
            }
            const cur_identity: boolean = (this._azsql as AZSql).getIdentity();
            _get_identity && (this._azsql as AZSql).setIdentity(true);
            const rtn_val = await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT), this.getPreparedParameters());
            (this._azsql as AZSql).setIdentity(cur_identity);
            return rtn_val;
        }

        async doUpdateAsync(_require_where: boolean = true): Promise<AZSql.Result> {
            if (_require_where && this._sql_where.length < 1) {
                return {header: null, err: new Error('where clause required')} as AZSql.Result;
            }
            if (typeof this._azsql === 'undefined') {
                return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
            }
            return await (this._azsql as AZSql).setIdentity(true).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE), this.getPreparedParameters());
        }

        async doDeleteAsync(_require_where: boolean = true): Promise<AZSql.Result> {
            if (_require_where && this._sql_where.length < 1) {
                return {header: null, err: new Error('where clause required')} as AZSql.Result;
            }
            if (typeof this._azsql === 'undefined') {
                return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
            }
            return await (this._azsql as AZSql).setIdentity(true).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE), this.getPreparedParameters());
        }
    }
}