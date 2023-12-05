import config from 'config';
import { readFileSync } from 'fs';
import pg, { Pool, PoolClient, PoolConfig } from 'pg';
import { INSERT_POLYGON_PART_FIELDS } from './constants';
import type { PGConfig, PolygonPartRecord } from './types';

export class DBProvider {
  dbConfig: PGConfig;
  pool: Pool;

  constructor() {
    this.dbConfig = config.get<PGConfig>('pgConfig');
    const pgClientConfig: PoolConfig = {
      host: this.dbConfig.host,
      user: this.dbConfig.user,
      database: this.dbConfig.database,
      password: this.dbConfig.password,
    };

    if (this.dbConfig.sslEnabled) {
      pgClientConfig.ssl = {
        rejectUnauthorized: this.dbConfig.rejectUnauthorized,
        ca: readFileSync(this.dbConfig.sslPaths.ca),
        key: readFileSync(this.dbConfig.sslPaths.key),
        cert: readFileSync(this.dbConfig.sslPaths.cert),
      };
    }

    if (this.dbConfig.pool) {
      pgClientConfig.min = this.dbConfig.pool.min;
      pgClientConfig.max = this.dbConfig.pool.max;
    }

    this.pool = new pg.Pool(pgClientConfig);

    this.pool.on('error', (err, _) => {
      console.error('Unexpected error on idle client', err);
      this.pool.end();
      process.exit(1);
    });
  }

  public async connectToDb(): Promise<PoolClient> {
    const pgClient = await this.pool.connect();
    await pgClient.query(`SET search_path TO ${this.dbConfig.schema}, public;`);
    await pgClient.query('BEGIN');
    pgClient.on('error', (err) => {
      console.error('DB client error', err);
    });
    return pgClient;
  }

  public async commit(pgClient: PoolClient) {
    await pgClient.query('COMMIT');
  }

  public async rollback(pgClient: PoolClient) {
    await pgClient.query('ROLLBACK');
  }

  public async end() {
    await this.pool.end();
  }

  public async insertPolygon(polygon: PolygonPartRecord,
    pgClient: PoolClient): Promise<void> {
    const insertPolygonPartValues = Object.entries(polygon).map(([key, value]) => {
      if (INSERT_POLYGON_PART_FIELDS.includes(key)) return value;
    });
    const fieldsPlaceholders = INSERT_POLYGON_PART_FIELDS.map((_, index) => `$${index + 1}`);
    const query = `CALL \"${this.dbConfig.schema}\".${this.dbConfig.storedProcedure}((${fieldsPlaceholders})::\"${this.dbConfig.schema}\".${this.dbConfig.insertPolygonPartRecord})`;

    await pgClient.query(query, insertPolygonPartValues);
  }
}
