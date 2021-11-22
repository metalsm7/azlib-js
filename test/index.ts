import { AZData, AZList, AZSql } from '../src/index';

const sql: AZSql = new AZSql();
sql.setParameters(new AZData().add('k1', 'v1').add('k2', 22));
console.log(`k1:${sql.getParamter<number>('k1')}`);
console.log(`k2.number:${sql.getParamter<number>('k2')} / ${typeof sql.getParamter<number>('k2')}`);
console.log(`k2.string:${sql.getParamter<string>('k2')} / ${typeof sql.getParamter<string>('k2')}`);

const bql: AZSql.BQuery = new AZSql.BQuery('board_data');
bql.set('col_1', 31);
bql.set('col_2', 'val_2');
let query: string = bql.createQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE);
console.log(`query:${query}`);

query = bql.setIsPrepared(true).createQuery(AZSql.BQuery.CREATE_QUERY_TYPE.UPDATE);
console.log(`query:${query}`);
