import { EOL } from 'os';
import { AZData, AZList, AZSql } from '../src/index';

console.log(`stage.1`);
const sql: AZSql.Prepared = new AZSql.Prepared({
    sql_type: AZSql.SQL_TYPE.MYSQL,
    server: '127.0.0.1',
    id: 'scm',
    pw: 'Dada!Scm88',
    catalog: 'scm'
} as AZSql.Option);
console.log(`stage.2`);
sql.setParameters(new AZData().add('k1', 'v1').add('k2', 22));
console.log(`k1:${sql.getParamter<number>('k1')}`);
console.log(`k2.number:${sql.getParamter<number>('k2')} / ${typeof sql.getParamter<number>('k2')}`);
console.log(`k2.string:${sql.getParamter<string>('k2')} / ${typeof sql.getParamter<string>('k2')}`);
console.log(`stage.3`);

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

const test: Function = async () => {
    // console.log(`stage.4`);
    // const res: any = await sql.openAsync();
    // console.log(res);
    // console.log(`stage.5`);

    // // await sql.beginTran();
    // // sql.executeAsync('SELECT 1, @sel1 as sel1', new AZData().add('@sel1', 'select_val_1'));
    // await sql.beginTran(
    //     () => {
    //         console.log(`beginTran.on_commit`);
    //     },
    //     () => {
    //         console.log(`beginTran.on_rollback`);
    //     });
    // let qres: AZSql.Result = await sql.executeAsync('INSERT INTO corp_fee (keyCorp, fee) VALUES (@keyCorp, @fee)', new AZData().add('@keyCorp', 1).add('@fee', .03));
    // console.log(`identity:${qres.identity}`);
    // const id: number = qres.identity;
    // qres = await sql.executeAsync('UPDATE corp_fee SET fee=@fee WHERE keyFee=@keyFee', new AZData().add('@keyFee', id).add('@fee', .04));
    // console.log(`affected:${qres.affected}`);
    // await sql.commit();
    // sql.clear();
    // qres = await sql.executeAsync('DELETE FROM corp_fee WHERE keyFee=@keyFee', new AZData().add('@keyFee', id).add('@fee', .04));
    // console.log(`affected:${qres.affected}`);

    // process.exit(1);

    const bSql: AZSql.Basic = new AZSql.Basic('corp_fee', sql);
    bSql
        .setIsPrepared(true)
        .set('keyCorp', 1)
        .set('fee', .2)
        .where('keyFee', 21);
    let query: string = bSql.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.INSERT);
    console.log(`query:${query}`);
    
    bSql
        .clear()
        .setIsPrepared(true)
        .set('fee', .07)
        .where('keyFee', 21);
    query = bSql.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE);
    console.log(`query:${query}`);
    
    bSql
        .clear()
        .setIsPrepared(true)
        .where('fee', .07)
        .where('keyFee', 21);
    query = bSql.getQuery(AZSql.BQuery.CREATE_QUERY_TYPE.DELETE);
    console.log(`query:${query}`);
};

test();