# Install
```
$ npm install azlib
```

# 초기화
- 만들어진 connection 사용
```ts
import { createConnection } from 'mysql2/promise';
const pool = createConnection({...});

const sql: AZSql = new AZSql(pool);
```
- 만들어진 pool 사용
```ts
import { createPool } from 'mysql2/promise';
const pool = createPool({...});

const sql: AZSql = new AZSql(pool);
```
- 연결정보를 전달하여 직접 connection 생성
```ts
const sql: AZSql = new AZSql({
    sql_type: AZSql.SQL_TYPE.MYSQL,
    server: '주소',
    id: '아이디',
    pw: '비번',
    catalog: '카탈로그/DB명'
} as AZSql.Option);
```

# API
- executeAsync
- getListAsync
- getDataAsync
- getAsync

## executeAsync
- executeAsync(query: string): number
- executeAsync(query: string, params: object|AZData): number
- executeAsync(query: string, params: object|AZData, return_params: object|AZData): number

## getListAsync
- getListAsync(query: string): Array<any>
- getListAsync(query: string, params: object|AZData): Array<any>

## getDataAsync
- getDataAsync(query: string): object|null
- getDataAsync(query: string, params: object|AZData): object|null

## getAsync
- getAsync(query: string): any
- getAsync(query: string, params: object|AZData): any

```ts
// SELECT 사용법 #1
const sql: AZSql = new AZSql(option);
const res: any = await sql.getDataAsync("SELECT name, num FROM T_User WHERE no=1");

// SELECT 사용법 #2, Prepared Statement 사용
const sql: AZSql.Prepared = new AZSql.Prepared(option);
sql.setQuery("SELECT name, num FROM T_User WHERE no=@no");
sql.addParameter("@no", 1);
const res: any = await sql.getDataAsync();
```
```ts
// INSERT 사용법 #1
const sql: AZSql = new AZSql(option);
const res: AZSql.Result = await sql.executeAsync("INSERT INTO T_User (name, num) VALUES ('이름', 1)");

// INSERT 사용법 #2, Prepared Statement 사용
const sql: AZSql = new AZSql(option);
sql.setQuery("INSERT INTO T_User (name, num) VALUES (@name, @num)");
// AddParameter를 통해서 파라메터 값이 등록되면 자동으로 PreparedStatement 처리를 하게 됩니다
sql.addParameter("@name", "이름");
sql.addParameter("@no", 1);
const res: AZSql.Result = await sql.executeAsync();

// INSERT 사용법 #3, Prepared Statement 사용
const sql: AZSql.Prepared = new AZSql.Prepared(option);
sql.setQuery("INSERT INTO T_User (id, name) VALUES (@name, @name)");
sql.addParameter("@name", "이름");
sql.addParameter("@no", 1);
const res: AZSql.Result = sql.executeAsync();

// INSERT 사용법 #4
const sql: AZSql.Basic = new AZSql.Basic("T_User", option);
// Prepared Statement 적용을 원하는 경우 setIsPrepared 메소드를 사용 합니다.
// sql.setIsPrepared(true);
sql.set("name", "이름");
sql.set("no", 1);
const res: AZSql.Result = await sql.doInsert();
```
```ts
// UPDATE 사용법 #1
AZSql sql = new AZSql(db_con_string);
sql.Execute("UPDATE T_User SET name='이름' WHERE no=1");

// UPDATE 사용법 #2, Prepared Statement 사용
AZSql.Prepared p_sql = new AZSql.Prepared(db_con_string);
p_sql.SetQuery("UPDATE T_User SET name=@name WHERE no=@no");
p_sql.AddParam("@name", "이름");
p_sql.AddParam("@no", 1);
p_sql.Execute();

// UPDATE 사용법 #3
AZSql.Basic b_sql = new AZSql.Basic("T_User", db_con_string);
// Prepared Statement 적용을 원하는 경우 SetIsPrepared 메소드를 사용 합니다.
// bSql.SetIsPrepared(true); // or bSql.IsPrepared = true;
b_sql.Set("name", "이름");
b_sql.Where("no", 1);   // WHERE 메소드는 기본적으로 "=" 조건이 사용됩니다.
b_sql.DoUpdate();

// UPDATE 사용법 #3 - IN 조건
b_sql = new AZSql.Basic("T_User", db_con_string);
b_sql.Set("name", "이름");
b_sql.Where("no", new object[] {1, 2, 3, 4}, AZSql.Basic.WHERETYPE.IN);
b_sql.DoUpdate();

// UPDATE 사용법 #3 - BETWEEN 조건
b_sql = new AZSql.Basic("T_User", db_con_string);
b_sql.Set("name", "이름");
b_sql.Where("no", new object[] {1, 4}, AZSql.Basic.WHERETYPE.BETWEEN);
b_sql.DoUpdate();
```
```c#
// DELETE 사용법 #1
AZSql sql = new AZSql(db_con_string);
sql.Execute("DELETE T_User WHERE no=1");

// DELETE 사용법 #2, Prepared Statement 사용
AZSql.Prepared p_sql = new AZSql.Prepared(db_con_string);
p_sql.SetQuery("DELETE T_User WHERE no=@no");
p_sql.AddParam("@no", 1);
p_sql.Execute();

// DELETE 사용법 #3
AZSql.Basic b_sql = new AZSql.Basic("T_User", db_con_string);
// Prepared Statement 적용을 원하는 경우 SetIsPrepared 메소드를 사용 합니다.
// bSql.SetIsPrepared(true); // or bSql.IsPrepared = true;
b_sql.Where("no", 1);   // WHERE 메소드는 기본적으로 "=" 조건이 사용됩니다.
b_sql.DoDelete();

// DELETE 사용법 #3 - IN 조건
b_sql = new AZSql.Basic("T_User", db_con_string);
b_sql.Where("no", new object[] {1, 2, 3, 4}, AZSql.Basic.WHERETYPE.IN);
b_sql.DoDelete();

// DELETE 사용법 #3 - BETWEEN 조건
b_sql = new AZSql.Basic("T_User", db_con_string);
b_sql.Where("no", new object[] {1, 4}, AZSql.Basic.WHERETYPE.BETWEEN);
b_sql.DoDelete();
```
```ts
// Transaction 사용법
const sql = new AZSql(db_con_string);
await sql.beginTran(
    (on_commit) => {}, 
    (on_rollback) => {}
);
// 순차적으로 쿼리를 처리해 가다가 예외 발생시 자동으로 Rollback 처리 하게 됩니다.
await sql.getDataAsync("SELECT name, no FROM T_User with (nolock) WHERE no=1");
await sql.executeAsync("UPDATE T_User SET name='user1' WHERE no=1");
await sql.executeAsync("DELETE T_User WHERE no=1");
// 처리 중 발생된 반환값들을 AZData 형식으로 반환 처리 합니다.
const {res, err} = const sql.commit((res: any[]|null, err: any) => {
    if (err) {
        // 에러 처리
    }
});
//
if (err) {
    // 에러 처리
}
```
