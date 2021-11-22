import { AZData } from './azdata';
export declare class AZSql {
    private _option;
    private _connected;
    private _query;
    private _parameters;
    private _return_parameters;
    private _identity;
    private _in_transaction;
    private _transaction_result;
    private _is_stored_procedure;
    private _sql_connection;
    constructor();
    setQuery(query: string): AZSql;
    getQuery(): string | null;
    clearQuery(): AZSql;
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
    openAsync(): Promise<void>;
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
    class BQuery {
        private _table_name;
        private _prepared;
        private _sql_set;
        constructor(table_name?: string, prepared?: boolean);
        isPrepared(): boolean;
        setIsPrepared(prepared: boolean): BQuery;
        set(column: string | AZSql.BQuery.SetData, value?: any, value_type?: BQuery.VALUETYPE): BQuery;
        createQuery(query_type: BQuery.CREATE_QUERY_TYPE): string;
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
    }
}
