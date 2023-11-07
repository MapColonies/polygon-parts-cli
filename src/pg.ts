import config from 'config';
import { readFileSync } from 'fs';
import pg, { Pool, PoolClient, PoolConfig } from 'pg';
import { GeoJSONPolygon } from 'wellknown';
import { DataSource, PGConfig } from './types';

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
        key: readFileSync(this.dbConfig.sslPaths.key),
        cert: readFileSync(this.dbConfig.sslPaths.cert),
        ca: readFileSync(this.dbConfig.sslPaths.ca),
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
    pgClient.on('error', (err) => {
      console.error('DB client error', err);
    });
    return pgClient;
  }

  public async release() {
    this.pool.end();
  }

  public async insertPolygon(polygon: Record<DataSource, string | number | GeoJSONPolygon | undefined>,
    pgClient: PoolClient): Promise<number> {
    const fields = Object.keys(polygon).map(polygon => `"${polygon}"`);
    const values = Object.values(polygon);
    const fieldsPlaceholders = fields.map((_, index) => `$${index + 1}`);
    const query = `INSERT INTO \"${this.dbConfig.schema}\".${this.dbConfig.table}(${fields}) VALUES (${fieldsPlaceholders})`;

    const response = await pgClient.query(query, values);
    return response.rowCount;
  }
}