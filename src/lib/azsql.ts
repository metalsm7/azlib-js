import { EOL } from 'os';
// import * as mysql from 'mysql2/promise';
import * as mysql from 'mysql2/promise';
import { AZMap } from './azmap';
import { AZData } from './azdata';
import { AZList } from './azlist';
import { StringBuilder } from './stringbuilder';
import { ResultSetHeader } from 'mysql';

export class AZSql {
    protected _option: AZSql.Option|null = null;
    protected _connected: boolean = false;
    
    protected _query: string|null = null;
    protected _parameters: AZData|null = null;
    protected _return_parameters: AZData|null = null;
    // private _identity: boolean = false;

    protected _in_transaction: boolean = false;
    protected _transaction: any = null;
    protected _transaction_result: AZData|null = null;
    protected _transaction_on_commit: Function|null = null;
    protected _transaction_on_rollback: Function|null = null;

    protected _is_stored_procedure: boolean = false;

    protected _sql_connection: mysql.Connection|null = null;

    protected _is_prepared: boolean = false;

    constructor(connection_or_option: AZSql.Option|mysql.Connection) {
        console.log(connection_or_option);
        console.log(typeof connection_or_option);
        if ((connection_or_option as AZSql.Option)['sql_type'] !== undefined) {
            this._option = connection_or_option as AZSql.Option;
        }
    }

    clear(): AZSql {
        this.setIsStoredProcedure(false);
        // this.setIdentity(false);
        this.clearQuery();
        this.clearParameters();
        this.clearRetuenParameters();
        this.clearTran();
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
        if (this._parameters === null) return [this._query, null];
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
            query = query.replace(regex, '$1?$3');
            param.push(this._parameters?.get(key));
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

    setParameters(parameters: AZData): AZSql {
        if (this._parameters === null) {
            this._parameters = new AZData();
        }
        else { 
            this._parameters.clear();
        }
        
        this._parameters = parameters;
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
    

    setRetuenParameters(parameters: AZData): AZSql {
        if (this._return_parameters === null) {
            this._return_parameters = new AZData();
        }
        else { 
            this._return_parameters.clear();
        }
        
        this._return_parameters = parameters;
        return this;
    }

    getRetuenParamters(): AZData|null {
        return this._return_parameters;
    }

    getRetuenParamter<Type>(key: string): Type {
        return this._return_parameters?.get(key) as Type;
    }

    addRetuenParameter(key: string, value: any): AZSql {
        this._return_parameters?.add(key, value);
        return this;
    }

    addRetuenParamters(paramters: AZData): AZSql {
        this._return_parameters?.add(paramters);
        return this;
    }

    updateReturnParamter(key: string|number, value: any): AZSql {
        this._return_parameters?.set(key, value);
        return this;
    }

    clearRetuenParameters(): AZSql {
        this._return_parameters?.clear();
        return this;
    }

    removeRetuenParamters(): AZSql {
        this._return_parameters = null;
        return this;
    }

    // setIdentity(identity: boolean): AZSql {
    //     this._identity = identity;
    //     return this;
    // }

    // getIdentity(): boolean {
    //     return this._identity;
    // }

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
                this._sql_connection = await new (mysql.createConnection as any)({
                    host: this.option?.server,
                    user: this.option?.id,
                    password: this.option?.pw,
                    database: this.option?.catalog,
                });
                break;
        }
        return this._connected = this._sql_connection !== null;
    }

    async beginTran(_on_commit?: Function, _on_rollback?: Function): Promise<void> {
        if (this._in_transaction) throw new Error('Transaction in use');
        if (this._transaction !== null) throw new Error('Transaction exists');
        this._transaction = this._sql_connection?.beginTransaction();
        this._transaction
            .catch((err: Error) => {
                this._transaction = null;
            })
            .then(() => {
                this._in_transaction = true;
                typeof _on_commit !== 'undefined' && (this._transaction_on_commit = _on_commit);
                typeof _on_rollback !== 'undefined' && (this._transaction_on_rollback = _on_rollback);
            });
    }

    async commit(): Promise<void> {
        if (this._in_transaction) {
            await this._sql_connection?.commit();
            this._transaction_on_commit && this._transaction_on_commit();
        }
        this.clearTran();
    }

    async rollback(): Promise<void> {
        if (!this._in_transaction) throw new Error('Transaction not exists');
        await this._sql_connection?.rollback();

        this._transaction_on_rollback && this._transaction_on_rollback();

        this.clearTran();
    }

    clearTran(): AZSql {
        this._transaction = null;
        this._in_transaction = false;
        this._transaction_on_commit = null;
        this._transaction_on_rollback = null;
        return this;
    }

    async executeAsync(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|boolean,
        return_param_or_id?: AZData|boolean,
        is_sp?: boolean
    ): Promise<AZSql.Result> {
        typeof is_sp !== 'undefined' && this.setIsStoredProcedure(is_sp);
        if (typeof return_param_or_id !== 'undefined') {
            if (return_param_or_id instanceof AZData) {
                this.setRetuenParameters(return_param_or_id as AZData);
            }
            else {
                // this.setIdentity(return_param_or_id as boolean);
            }
        }
        if (typeof param_or_id !== 'undefined') {
            if (param_or_id instanceof AZData) {
                this.setParameters(param_or_id as AZData);
            }
            else {
                // this.setIdentity(param_or_id as boolean);
            }
        }
        if (typeof query_or_id !== 'undefined') {
            if (typeof query_or_id === 'string') {
                this.setQuery(query_or_id as string);
            }
            else {
                // this.setIdentity(query_or_id as boolean);
            }
        }

        const is_prepared: boolean = this.isPrepared || this.getParamters() !== null && ((this.getParamters() as AZData).size() > 0);

        let rtn_val: AZSql.Result = {header: null, err: null} as AZSql.Result;
        if (this.inTransaction && !this.connected) return Promise.reject(new Error('Not connected'));
        if (this.connected) {
            switch (this.option?.sql_type) {
                case AZSql.SQL_TYPE.MYSQL:
                    if (is_prepared) {
                        const [query, params] = this.getPreapredQueryAndParams();
                        console.log(`query:`);
                        console.log(query);
                        console.log(`params:`);
                        console.log(params);
                        const res = await this._sql_connection?.execute(query as string, params)
                            .catch(async (err: Error) => {
                                this.inTransaction && await this.rollback();
                                return [ null, err ];
                            });
                        // console.log(`res:`);
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
                        console.log(res);
                        // if ((res as any)[1] !== null) throw (res as any)[1] as Error;
                        // rtn_val = this.getIdentity() ?
                        //     ((res as Array<any>)[0] as ResultSetHeader).insertId :
                        //     ((res as Array<any>)[0] as ResultSetHeader).affectedRows;
                        const header = ((res as Array<any>)[0] as ResultSetHeader);
                        rtn_val.affected = header.affectedRows;
                        rtn_val.identity = header.insertId;
                        rtn_val.header = header;
                        rtn_val.err = (res as Array<any>)[1];
                    }
                    else {
                        const res = await this._sql_connection?.query(this._query as string)
                            .catch(async (err: Error) => {
                                this.inTransaction && await this.rollback();
                                return [ null, err ];
                            });
                    }
                    break;
            }
        }
        return rtn_val;
    }

    async get(
        query_or_id?: string|boolean, 
        param_or_id?: AZData|boolean,
        return_param_or_id?: AZData|boolean,
        is_sp?: boolean
    ): Promise<AZSql.Result> {
        typeof is_sp !== 'undefined' && this.setIsStoredProcedure(is_sp);
        if (typeof return_param_or_id !== 'undefined') {
            if (return_param_or_id instanceof AZData) {
                this.setRetuenParameters(return_param_or_id as AZData);
            }
            else {
                // this.setIdentity(return_param_or_id as boolean);
            }
        }
        if (typeof param_or_id !== 'undefined') {
            if (param_or_id instanceof AZData) {
                this.setParameters(param_or_id as AZData);
            }
            else {
                // this.setIdentity(param_or_id as boolean);
            }
        }
        if (typeof query_or_id !== 'undefined') {
            if (typeof query_or_id === 'string') {
                this.setQuery(query_or_id as string);
            }
            else {
                // this.setIdentity(query_or_id as boolean);
            }
        }
    }

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
        affected: number,
        identity: number,
        header?: any,
        err: Error|null,
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
        constructor(connection_or_option: AZSql.Option|mysql.Connection) {
            super(connection_or_option);
            this.setPrepared(true);
        }
    }

    export class BQuery {
        protected _table_name: string|null = null;
        protected _prepared: boolean = false;
        protected _sql_set: AZList;
        protected _sql_where: Array<BQuery.Condition|BQuery.And|BQuery.Or>;

        constructor(table_name?: string, prepared: boolean = false) {
            typeof table_name !== 'undefined' && (this._table_name = table_name);
            this._prepared = prepared;
            this._sql_set = new AZList();
            this._sql_where = new Array<BQuery.Condition|BQuery.And|BQuery.Or>();
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
                                if (this.isPrepared()) {
                                    rtn_val.append(`@${data.getKey(0).replace(/\./, '___')}_set_${cnti + 1}`);
                                }
                                else {
                                    const val: any = data.get(0);
                                    if (['number', 'boolean'].indexOf(typeof val) > -1) {
                                        rtn_val.append(`${data.get(0)}`);
                                    }
                                    else {
                                        rtn_val.append(`'${data.get(0)}'`);
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
                                    rtn_val.add(`@${this._column?.replace(/\./, '___')}_where_${index}_between_2`, this._value);
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

        async doInsert(): Promise<AZSql.Result> {
            if (typeof this._azsql === 'undefined') {
                return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
            }
            return await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT), this.getPreparedParameters());
        }

        async doUpdate(_require_where: boolean = true): Promise<AZSql.Result> {
            if (_require_where && this._sql_set.size() < 1) {
                return {header: null, err: new Error('where clause required')} as AZSql.Result;
            }
            if (typeof this._azsql === 'undefined') {
                return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
            }
            return await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE), this.getPreparedParameters());
        }

        async doDelete(_require_where: boolean = true): Promise<AZSql.Result> {
            if (_require_where && this._sql_set.size() < 1) {
                return {header: null, err: new Error('where clause required')} as AZSql.Result;
            }
            if (typeof this._azsql === 'undefined') {
                return {header: null, err: new Error('AZSql is not defined')} as AZSql.Result;
            }
            return await (this._azsql as AZSql).executeAsync(this.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE), this.getPreparedParameters());
        }
    }
}