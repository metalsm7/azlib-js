# azlib / Com.Mparang.AZLib
- C#, Java, JavaScript에서 동일한 방식으로 데이터 핸들링을 위한 라이브러리 작성이 목표
- C#은 .Net 4.0, 4.5.2, Standard1.4, CoreApp1.0 를 지원합니다

## Install
1) NPM
```
$ npm i azlib
```

## AZSql
### Database 연결 및 데이터 처리 헬퍼 (현재 mysql, sqlite만 지원)
- PreparedStatement 처리 지원
- StoredProcedure 처리 지원
- Transaction 처리 지원 (처리중 오류 발생시 바로 Rollback 처리되며, 이후 예외처리를 위한 Action을 호출하게 됩니다)

기본적인 사용법은 아래와 같습니다.

```ts
// 예제를 위해 선언된 DB연결 옵션
const option: AZSql.Option = {
    host: '127.0.0.1',
    user: 'test',
    password: 'test',
    database: 'test'
};
```
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
```c#
// Transaction 사용법
AZSql sql = new AZSql(db_con_string);
sql.BeginTran(
    (ex_on_commit) => Console.WriteLine("Commit 또는 쿼리 처리시 발생된 예외 : " + ex_on_commit.ToString()), 
    (ex_on_rollback) => Console.WriteLine("Rollback 처리시 발생된 예외 : " + ex_on_rollback.ToString())
);
// 순차적으로 쿼리를 처리해 가다가 예외 발생시 자동으로 Rollback 처리 하게 됩니다.
sql.GetData("SELECT name, no FROM T_User with (nolock) WHERE no=1");
sql.Execute("UPDATE T_User SET name='user1' WHERE no=1");[]
sql.Execute("DELETE T_User WHERE no=1");
// 처리 중 발생된 반환값들을 AZData 형식으로 반환 처리 합니다.
AZData result = sql.Commit();
```
