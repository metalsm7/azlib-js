import { EOL } from 'os';
import { AZData, AZList, AZSql } from '../src/index';
import * as mysql from 'mysql2/promise';
import * as sqlite3 from 'sqlite3';

const test_sqlite: Function = async () => {
    const db: sqlite3.Database = new sqlite3.Database('/Users/dev/development/priv/minrepo/data/db/db.sqlite');

    let sql: AZSql.Basic = await new AZSql.Basic('maven_repo', new AZSql(db))
        .setPrepared(true)
        .set('group_id', 'com.mparang')
        .set('artifact_id', 'azlib')
        .set('release_version', '0.1.0')
        .set('latest_version', '0.1.0')
        .set('created_at', `strftime('%s','now')`, AZSql.BQuery.VALUETYPE.QUERY);
    console.log(`publish - addRepo.query:${sql.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT)}`);
    console.log(`publish - addRepo.params:${sql.getPreparedParameters().toJsonString()}`);
    let id: number = await sql.doInsertAsync(true);
    console.log(`publish - addRepo.id:${id}`);
};

const test_mysql: Function = async () => {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'scm',
        password: 'Dada!Scm88',
        database: 'scm',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
    });

    const con = await mysql.createConnection({
        host: 'localhost',
        user: 'scm',
        password: 'Dada!Scm88',
        database: 'scm',
        multipleStatements: true,
    });

    console.log(`stage.1`);
    // let sql: AZSql.Prepared = new AZSql.Prepared({
    //     sql_type: AZSql.SQL_TYPE.MYSQL,
    //     server: '127.0.0.1',
    //     id: 'scm',
    //     pw: 'Dada!Scm88',
    //     catalog: 'scm'
    // } as AZSql.Option);
    // let sql: AZSql.Prepared = new AZSql.Prepared(pool);
    let sql: AZSql = new AZSql(pool);
    // let sql: AZSql.Prepared = new AZSql.Prepared(con);
    // let sql: AZSql = new AZSql(con);

    let mres: any;

    mres = await sql.clear().executeAsync('SELECT 1, @sel1 as sel1;SELECT 2, @sel2 as sel2', new AZData().add('@sel1', 'select_val_1').add('@sel2', 'select_row_2'));
    console.log(`mres:${mres} / results:${JSON.stringify(sql.getResults())}`);


    mres = await sql.clear().setPrepared(true).executeAsync('SELECT 1, @sel1 as sel1', new AZData().add('@sel1', 'select_val_1').add('@sel2', 'select_row_2'));
    console.log(`mres:${mres} / results:${JSON.stringify(sql.getResults())}`);
    
    await sql.beginTran(
        () => {
            console.log(`beginTran.on_commit`);
            console.log(`TransactionResults`);
            console.log(sql.getTransactionResults());
        },
        () => {
            console.log(`beginTran.on_rollback`);
        });
    mres = await sql.clear().setPrepared(true).setIdentity(true).executeAsync('INSERT INTO corp_fee (keyCorp, fee) VALUES (@keyCorp, @fee)', new AZData().add('@keyCorp', 1).add('@fee', .03));
    console.log('mres----------------------------------');
    console.log(mres);
    let id: any;
    id = mres as number;

    mres = await sql.clear().setPrepared(false).executeAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFees)', new AZData().add('@keyFees', [1, 4]));
    console.log('mres----------------------------------');
    console.log(mres);

    mres = await sql.clear().setPrepared(false).executeAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFees)', { '@keyFees': [1, 4] });
    console.log('mres----------------------------------');
    console.log(mres);
    console.log('results----------------------------------');
    console.log(sql.getResults());

    mres = await sql.clear().setPrepared(true).executeAsync('UPDATE corp_fee SET fee=@fee WHERE keyFee=@keyFee', new AZData().add('@keyFee', id).add('@fee', .04));
    console.log('mres----------------------------------');
    console.log(mres);
    mres = await sql.clear().setPrepared(true).executeAsync('DELETE FROM corp_fee WHERE keyFee=@keyFee', new AZData().add('@keyFee', id).add('@fee', .04));
    console.log('mres----------------------------------');
    console.log(mres);
    await sql.commit();
    console.log(`sql.commit`);

    mres = await sql.clear().setPrepared(true).getListAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFees)', new AZData().add('@keyFees', [1, 3, 4]));
    console.log('mres----------------------------------');
    console.log(mres);

    mres = await sql.clear().setPrepared(true).getDataAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFees) ORDER BY keyFee DESC', new AZData().add('@keyFees', [1, 2, 4]));
    console.log('mres----------------------------------');
    console.log(mres);

    mres = await sql.clear().setPrepared(true).getAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFees) ORDER BY keyFee DESC', new AZData().add('@keyFees', [1, 2, 4]))
        .catch(err => {
            console.log('err----------------------------------');
            console.log(err.message);
            return null;
        });
    console.log('mres----------------------------------');
    console.log(mres);

    mres = await sql.clear().setPrepared(false).setStoredProcedure(true).executeAsync('call corp_board_getList(@o_code, @o_ret, @type, @offset, @limit)', {'@type': 1, '@offet': 0, '@limit': 10}, new AZData().add('@o_code', null).add('@o_ret', null));
    console.log('mres----------------------------------');
    console.log(mres);
    console.log('results----------------------------------');
    console.log(sql.getResults());
    console.log('returns----------------------------------');
    console.log(sql.getReturnParamters()?.toJsonString());

    process.exit(0);
    
    // console.log(`stage.2`);
    // sql.setParameters(new AZData().add('k1', 'v1').add('k2', 22));
    // console.log(`k1:${sql.getParamter<number>('k1')}`);
    // console.log(`k2.number:${sql.getParamter<number>('k2')} / ${typeof sql.getParamter<number>('k2')}`);
    // console.log(`k2.string:${sql.getParamter<string>('k2')} / ${typeof sql.getParamter<string>('k2')}`);
    // console.log(`stage.3`);


    // const bql: AZSql.BQuery = new AZSql.BQuery('board_data');
    // bql.set('col_1', 31);
    // bql.set('col_2', 'val_2');
    // bql.set('col_3', 'NOW()', AZSql.BQuery.VALUETYPE.QUERY);
    // bql.where('col_1', [1, 3, 31], AZSql.BQuery.WHERETYPE.IN)
    // bql.where('col_4', 22)
    // bql.where('col_5', '%as', AZSql.BQuery.WHERETYPE.LIKE)
    // let query: string = bql.setIsPrepared(false).getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE);
    // console.log(`query.UPDATE:${EOL}${query}`);

    // query = bql.setIsPrepared(true).getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE);
    // console.log(`query.UPDATE.Query:${EOL}${query}`);
    // let param: AZData = bql.getPreparedParameters();
    // console.log(`query.UPDATE.Param:${EOL}${param.toJsonString()}`);


    // console.log(`stage.4`);
    // const res: any = await sql.openAsync();
    // console.log(res);
    // console.log(`stage.5`);

    let qres: any;

    // await sql.beginTran();
    // console.log(`affected:${qres.affected}`);

    // process.exit(1);

    qres = await sql
        .setPrepared(true)
        .executeAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFee)', new AZData().add('@keyFee', [1, '2']));
    console.log('qres----------------------------------');
    console.log(qres);

    try {
        const list: Array<any> = await sql.getListAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFee)', new AZData().add('@keyFee', [1, 2]));
        console.log('list----------------------------------');
        console.log(list);
        const data: object|null = await sql.getDataAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFee)', new AZData().add('@keyFee', [2, 3]));
        console.log('data----------------------------------');
        console.log(data);
        const obj: string = await sql.getAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFee)', new AZData().add('@keyFee', [2, 3]));
        console.log('obj----------------------------------');
        console.log(`val:${obj} / type:${typeof obj}`);
        console.log(`val:${(obj as string)} / type:${typeof (String(obj))}`);
    }
    catch (e: any) {
        console.log('test.e----------------------------------');
        console.log(e);
        process.exit(9);
    }

    const bSql: AZSql.Basic = new AZSql.Basic('corp_fee', sql);
    let res: Array<any> = await bSql
        .setPrepared(true)
        .where('keyCorp', [1,2,3], AZSql.BQuery.WHERETYPE.IN)
        // .where('keyFee', 21, AZSql.BQuery.WHERETYPE.IN)
        .doSelectAsync();
    console.log(`---------------`);
    console.log(`res`);
    console.log(res);

    // bSql
    //     .setIsPrepared(true)
    //     .set('keyCorp', 1)
    //     .set('fee', .2)
    //     .where('keyCorp', 1, AZSql.BQuery.WHERETYPE.BETWEEN)
    //     .where('keyFee', 21, AZSql.BQuery.WHERETYPE.IN);
    // let query: string = bSql.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT);
    // let param: AZData = bSql.getPreparedParameters();
    // let res: AZSql.Result = await bSql.doInsert();
    // console.log(`---------------`);
    // console.log(`query`);
    // console.log(query);
    // console.log(`---------------`);
    // console.log(`param`);
    // console.log(param.toJsonString());
    // console.log(`---------------`);
    // console.log(`res`);
    // console.log(res);

    // const id: number = res.identity as number;
    
    // bSql
    //     .clear()
    //     .setIsPrepared(true)
    //     .set('fee', .07)
    //     // .where('keyCorp', 1, AZSql.BQuery.WHERETYPE.BETWEEN)
    //     .where('keyFee', id, AZSql.BQuery.WHERETYPE.IN);
    // query = bSql.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE);
    // param = bSql.getPreparedParameters();
    // res = await bSql.doUpdate();
    // console.log(`---------------`);
    // console.log(`query`);
    // console.log(query);
    // console.log(`---------------`);
    // console.log(`param`);
    // console.log(param.toJsonString());
    // console.log(`---------------`);
    // console.log(`res`);
    // console.log(res);
    
    // bSql
    //     .clear()
    //     .setIsPrepared(true)
    //     .where('fee', .07)
    //     // .where('keyCorp', 1, AZSql.BQuery.WHERETYPE.BETWEEN)
    //     .where('keyFee', id, AZSql.BQuery.WHERETYPE.IN);
    // query = bSql.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE);
    // param = bSql.getPreparedParameters();
    // res = await bSql.doDelete();
    // console.log(`---------------`);
    // console.log(`query`);
    // console.log(query);
    // console.log(`---------------`);
    // console.log(`param`);
    // console.log(param.toJsonString());
    // console.log(`---------------`);
    // console.log(`res`);
    // console.log(res);
    
    process.exit(0);
};

// test_mysql();
test_sqlite();