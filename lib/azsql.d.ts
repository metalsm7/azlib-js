import * as mysql2 from 'mysql2/promise';
import * as sqlite3 from 'sqlite3';
import { AZData } from './azdata';
import { AZList } from './azlist';
export declare class AZSql {
    protected _option: AZSql.Option;
    protected _connected: boolean;
    protected _query: string | null;
    protected _parameters: AZData | null;
    protected _return_parameters: AZData | null;
    private _identity;
    protected _in_transaction: boolean;
    protected _transaction: any;
    protected _transaction_result: AZData | null;
    protected _transaction_on_commit: Function | null;
    protected _transaction_on_rollback: Function | null;
    protected _is_stored_procedure: boolean;
    protected _sql_connection: mysql2.Connection | mysql2.Pool | sqlite3.Database | null;
    protected _sql_pool: mysql2.Pool | null;
    protected _is_prepared: boolean;
    constructor(connection_or_option: AZSql.Option | mysql2.Connection | mysql2.Pool | sqlite3.Database);
    clear(): AZSql;
    setQuery(query: string): AZSql;
    getQuery(_preapred?: boolean): string | null;
    clearQuery(): AZSql;
    setPrepared(prepared: boolean): AZSql;
    get isPrepared(): boolean;
    getPreapredQueryAndParams(): [string | null, Array<string> | null];
    setParameters(parameters: AZData): AZSql;
    getParamters(): AZData | null;
    getParamter<Type>(key: string): Type;
    addParameter(key: string, value: any): AZSql;
    addParamters(paramters: AZData): AZSql;
    clearParameters(): AZSql;
    removeParamters(): AZSql;
    setRetuenParameters(parameters: AZData): AZSql;
    getRetuenParamters(): AZData | null;
    getRetuenParamter<Type>(key: string): Type;
    addRetuenParameter(key: string, value: any): AZSql;
    addRetuenParamters(paramters: AZData): AZSql;
    updateReturnParamter(key: string | number, value: any): AZSql;
    clearRetuenParameters(): AZSql;
    removeRetuenParamters(): AZSql;
    setIdentity(identity: boolean): AZSql;
    getIdentity(): boolean;
    setIsStoredProcedure(is_stored_procedure: boolean): AZSql;
    getIsStoredProcedure(): boolean;
    openAsync(): Promise<boolean>;
    beginTran(_on_commit?: Function, _on_rollback?: Function): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    removeTran(): AZSql;
    executeAsync(query_or_id?: string | boolean, param_or_id?: AZData | boolean, return_param_or_id?: AZData | boolean, is_sp?: boolean): Promise<AZSql.Result>;
    get connected(): boolean;
    get inTransaction(): boolean;
    get option(): AZSql.Option | null;
}
export declare namespace AZSql {
    interface Option {
        sql_type?: string;
        connection_string?: string;
        server?: string;
        port?: number;
        catalog?: string;
        id?: string;
        pw?: string;
    }
    interface Result {
        affected?: number;
        identity?: number;
        header?: any;
        rows?: Array<any>;
        fileds?: Array<any>;
        err?: Error;
    }
    const SQL_TYPE: {
        MYSQL: string;
        SQLITE: string;
        SQLITE_ANDROID: string;
        MSSQL: string;
        MARIADB: string;
        ORACLE: string;
    };
    const _ATTRIBUTE_COLUMN: {
        LABEL: string;
        NAME: string;
        TYPE: string;
        TYPE_NAME: string;
        SCHEMA_NAME: string;
        DISPLAY_SIZE: string;
        SCALE: string;
        PRECISION: string;
        AUTO_INCREMENT: string;
        CASE_SENSITIVE: string;
        IS_NULLABLE: string;
        IS_READONLY: string;
        IS_WRITABLE: string;
        IS_SIGNED: string;
    };
    class Prepared extends AZSql {
        constructor(connection_or_option: AZSql.Option | mysql2.Connection | mysql2.Pool | sqlite3.Database);
    }
    class BQuery {
        protected _table_name: string | null;
        protected _prepared: boolean;
        protected _sql_set: AZList;
        protected _sql_where: Array<BQuery.Condition | BQuery.And | BQuery.Or>;
        constructor(table_name?: string, prepared?: boolean);
        isPrepared(): boolean;
        setIsPrepared(prepared: boolean): BQuery;
        clear(): BQuery;
        set(column: string | AZSql.BQuery.SetData, value?: any, value_type?: BQuery.VALUETYPE): BQuery;
        clearSet(): BQuery;
        where(column_or_data: BQuery.Condition | BQuery.And | BQuery.Or | string, value?: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE): BQuery;
        clearWhere(): BQuery;
        protected createQuery(query_type: BQuery.CREATE_QUERY_TYPE): string;
        getQuery(query_type: BQuery.CREATE_QUERY_TYPE): string;
        protected createPreparedParameters(): AZData;
        getPreparedParameters(): AZData;
    }
    namespace BQuery {
        enum WHERETYPE {
            GREATER_THAN = ">",
            GREATER_THAN_OR_EQUAL = ">=",
            GT = ">",
            GTE = ">=",
            LESS_THAN = "<",
            LESS_THAN_OR_EQUAL = "<=",
            LT = "<",
            LTE = "<=",
            EQUAL = "=",
            NOT_EQUAL = "<>",
            EQ = "=",
            NE = "<>",
            BETWEEN = "BETWEEN",
            IN = "IN",
            NOT_IN = "NOT IN",
            NIN = "NOT IN",
            LIKE = "LIKE"
        }
        enum VALUETYPE {
            VALUE = "VALUE",
            QUERY = "QUERY"
        }
        enum CREATE_QUERY_TYPE {
            INSERT = 0,
            UPDATE = 1,
            DELETE = 2,
            SELECT = 3
        }
        const ATTRIBUTE: {
            VALUE: string;
            WHERE: string;
        };
        class SetData {
            private _column;
            private _value;
            private _value_type;
            constructor(column?: string, value?: string, value_type?: BQuery.VALUETYPE);
            static init(): SetData;
            set(column: string, value: string, value_type?: BQuery.VALUETYPE): void;
            getQuery(): string;
            get column(): string | null;
            set column(column: string | null);
            get value(): string | null;
            set value(value: string | null);
            get value_type(): BQuery.VALUETYPE;
            set value_type(value_type: BQuery.VALUETYPE);
        }
        class Condition {
            private _column;
            private _value;
            private _where_type;
            private _value_type;
            private _prepared;
            constructor(column?: string, value?: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE);
            set(column: string, value: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE): void;
            setPrepared(prepare: boolean): Condition;
            isPrepared(): boolean;
            toAZData(index: number, _cb?: Function | null): AZData;
            toString(index: number, _cb?: Function | null): string;
        }
        class And {
            private _ands;
            private _prepared;
            constructor(...args: Array<Condition | And | Or>);
            add(...args: Array<Condition | And | Or>): And;
            setPrepared(prepared: boolean): And;
            isPrepared(): boolean;
            count(): number;
            toAZData(index: number, _cb?: Function | null): AZData;
            toString(index: number, _cb?: Function | null): string;
        }
        class Or {
            private _ors;
            private _prepared;
            constructor(...args: Array<Condition | And | Or>);
            add(...args: Array<Condition | And | Or>): Or;
            setPrepared(prepared: boolean): Or;
            isPrepared(): boolean;
            count(): number;
            toAZData(index: number, _cb?: Function | null): AZData;
            toString(index: number, _cb?: Function | null): string;
        }
    }
    class Basic extends AZSql.BQuery {
        private _azsql;
        constructor(table_name: string, azsql_or_option?: AZSql | AZSql.Option, prepared?: boolean);
        setIsPrepared(prepared: boolean): AZSql.Basic;
        clear(): AZSql.Basic;
        set(column: string | AZSql.BQuery.SetData, value?: any, value_type?: BQuery.VALUETYPE): AZSql.Basic;
        clearSet(): BQuery;
        where(column_or_data: BQuery.Condition | BQuery.And | BQuery.Or | string, value?: any, where_type?: BQuery.WHERETYPE, value_type?: BQuery.VALUETYPE): AZSql.Basic;
        clearWhere(): AZSql.Basic;
        doInsert(): Promise<AZSql.Result>;
        doUpdate(_require_where?: boolean): Promise<AZSql.Result>;
        doDelete(_require_where?: boolean): Promise<AZSql.Result>;
    }
}
