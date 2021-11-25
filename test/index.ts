import { EOL } from 'os';
import { AZData, AZList, AZSql } from '../src/index';
import * as mysql from 'mysql2/promise';
import * as sqlite3 from 'sqlite3';

const test: Function = async () => {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'scm',
        password: 'Dada!Scm88',
        database: 'scm',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    const con = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'scm',
        password: 'Dada!Scm88',
        database: 'scm',
    });

    console.log(`stage.1`);
    let sql: AZSql.Prepared = new AZSql.Prepared({
        sql_type: AZSql.SQL_TYPE.MYSQL,
        server: '127.0.0.1',
        id: 'scm',
        pw: 'Dada!Scm88',
        catalog: 'scm'
    } as AZSql.Option);
    // let sql: AZSql.Prepared = new AZSql.Prepared(pool);
    
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

    let qres: AZSql.Result;

    // await sql.beginTran();
    // sql.executeAsync('SELECT 1, @sel1 as sel1', new AZData().add('@sel1', 'select_val_1'));
    await sql.beginTran(
        () => {
            console.log(`beginTran.on_commit`);
        },
        () => {
            console.log(`beginTran.on_rollback`);
        });
    qres = await sql.executeAsync('INSERT INTO corp_fee (keyCorp, fee) VALUES (@keyCorp, @fee)', new AZData().add('@keyCorp', 1).add('@fee', .03));
    console.log('qres----------------------------------');
    console.log(qres);
    const id: number = qres.identity as number;
    qres = await sql.executeAsync('UPDATE corp_fee SET fee=@fee WHERE keyFee=@keyFee', new AZData().add('@keyFee', id).add('@fee', .04));
    console.log('qres----------------------------------');
    console.log(qres);
    console.log(`affected:${qres.affected}`);
    qres = await sql.executeAsync('DELETE FROM corp_fee WHERE keyFee=@keyFee', new AZData().add('@keyFee', id).add('@fee', .04));
    console.log('qres----------------------------------');
    console.log(qres);
    await sql.commit();
    console.log(`sql.commit`);
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
        const data: object = await sql.getDataAsync('SELECT * FROM corp_fee WHERE keyFee IN (@keyFee)', new AZData().add('@keyFee', [2, 3]));
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
        .setIsPrepared(true)
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


    
    sql = new AZSql.Prepared({
        sql_type: AZSql.SQL_TYPE.SQLITE,
        server: ':memory:',
    });
    console.log(`stage.4`);
    qres = await sql.executeAsync('CREATE TABLE test (id int, label varchar(20), desc text)');
    console.log(qres);
    console.log(`stage.5`);
    qres = await sql.executeAsync(`INSERT INTO test (id, label, desc) VALUES (1, 'id is 1', 'description here')`, true);
    console.log(qres);
    qres = await sql.executeAsync(`INSERT INTO test (id, label, desc) VALUES (2, 'id is 2', 'description here')`, true);
    console.log(qres);
    qres = await sql.executeAsync(`INSERT INTO test (id, label, desc) VALUES (3, 'id is 3', 'description here')`, true);
    console.log(qres);
    console.log(`stage.6`);
    qres = await sql.executeAsync(`SELECT * FROM test WHERE id in (@id)`, new AZData().add('@id', [1, 3]), false);
    console.log(qres);
    console.log(`stage.7`);
    qres = await sql.executeAsync(`SELECT * FROM test WHERE id in (@id)`, {'@id': [1, 3]}, false);
    console.log(qres);
    console.log(`stage.8.1`);
    let ares = await sql.getListAsync(`SELECT * FROM test WHERE id in (@id)`, {'@id': [1, 3]}, false);
    console.log(ares);
    console.log(`stage.8.2`);

    // console.log(`stage.8.1`);
    // let bSql: AZSql.Basic = new AZSql.Basic('test', sql);
    // console.log(`stage.8.2`);
    // let res: AZSql.Result = await bSql
    //     .setIsPrepared(true)
    //     .set('id', 11)
    //     .set('label', 'id is 11')
    //     .set('desc', 'test desc')
    //     .doInsert();
    // console.log(`stage.8.3`);
    // console.log(res);
    // console.log(`stage.8.4`);

    // await sql.executeAsync(`SELECT * FROM test`);
    // console.log(`stage.9`);

    // res = await bSql
    //     .clear()
    //     .setIsPrepared(true)
    //     .set('id', 21)
    //     .set('label', 'id is 11 to 21')
    //     .where('id', 11)
    //     .doUpdate();
    // console.log(`stage.10.1`);
    // console.log(res);
    // console.log(`stage.10.2`);

    // await bSql
    //     .clear()
    //     .setIsPrepared(true)
    //     .where('id', [2, 3], AZSql.BQuery.WHERETYPE.BETWEEN)
    //     .doDelete();

    // res = await sql.executeAsync(`SELECT * FROM test`);
    // console.log(`stage.11`);
    // console.log(res);
    
    process.exit(0);
};

test();