import{CapacitorSQLite,SQLiteConnection,type SQLiteDBConnection}from'@capacitor-community/sqlite';import type{LocalStore}from'@fps/mobile-runtime';

const SCHEMA_VERSION=2;

export class SqliteLocalStore implements LocalStore{
  private sqlite=new SQLiteConnection(CapacitorSQLite);
  private db?:SQLiteDBConnection;

  async init(){
    if(this.db)return;
    this.db=await this.sqlite.createConnection('fps',false,'no-encryption',SCHEMA_VERSION,false);
    await this.db.open();
    try{
      await this.migrate(this.db);
      await this.verifySchema(this.db);
    }catch(error){
      await this.db.close().catch(()=>undefined);
      this.db=undefined;
      throw error;
    }
  }

  private async migrate(db:SQLiteDBConnection){
    // Execute every DDL separately: upgrades must also repair databases created by older APKs.
    await db.execute('CREATE TABLE IF NOT EXISTS schema_meta(key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL)');
    await db.execute('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY NOT NULL,kind TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_records_kind_created ON records(kind,created_at)');
    await db.execute('CREATE TABLE IF NOT EXISTS prediction_runs(id TEXT PRIMARY KEY NOT NULL,fixture_id TEXT NOT NULL,event_at TEXT NOT NULL,captured_at TEXT NOT NULL,model_version TEXT NOT NULL,payload TEXT NOT NULL)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_prediction_fixture ON prediction_runs(fixture_id,captured_at)');
    await db.run('INSERT OR REPLACE INTO schema_meta(key,value) VALUES(?,?)',['schema_version',String(SCHEMA_VERSION)]);
  }

  private async verifySchema(db:SQLiteDBConnection){
    const required=['records','prediction_runs'];
    for(const table of required){
      const result=await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?",[table]);
      if(!result.values?.length)throw new Error(`Local database migration failed: missing table ${table}`);
    }
  }

  private async conn(){await this.init();return this.db!}

  async savePredictionRun(run:any){
    const db=await this.conn();
    await db.run('INSERT OR IGNORE INTO prediction_runs(id,fixture_id,event_at,captured_at,model_version,payload) VALUES(?,?,?,?,?,?)',[String(run.id),String(run.fixtureId),String(run.eventAt),String(run.capturedAt),String(run.modelVersion),JSON.stringify(run)]);
  }

  async listPredictionRuns(){
    const db=await this.conn(),r=await db.query('SELECT payload FROM prediction_runs ORDER BY captured_at DESC');
    return(r.values||[]).map((x:any)=>JSON.parse(x.payload));
  }

  async saveRecord(kind:string,record:any){
    const db=await this.conn(),id=String(record.id||crypto.randomUUID()),createdAt=String(record.createdAt||new Date().toISOString());
    await db.run('INSERT OR REPLACE INTO records(id,kind,created_at,payload) VALUES(?,?,?,?)',[id,kind,createdAt,JSON.stringify({...record,id,createdAt})]);
  }

  async listRecords(kind:string){
    const db=await this.conn(),r=await db.query('SELECT payload FROM records WHERE kind=? ORDER BY created_at DESC',[kind]);
    return(r.values||[]).map((x:any)=>JSON.parse(x.payload));
  }
}
