import { geojsonToWKT } from '@terraformer/wkt';
import { readFileSync } from 'fs';
import pg, { Pool, PoolClient, PoolConfig } from 'pg';
import { INSERT_PART_FIELDS } from './constants';
import type { PGConfig, PartRecord } from './types';

export class DBProvider {
  pool: Pool;
  backendPID: number | undefined;

  constructor(private readonly dbConfig: PGConfig) {
    const poolConfig = this.getPoolConfig(dbConfig);
    this.pool = new pg.Pool(poolConfig);

    this.pool.on('error', (err, _) => {
      console.error('Unexpected error on idle client', err);
      this.pool.end();
      process.exit(1);
    });
  }

  public async connectToDb(): Promise<PoolClient> {
    const pgClient = await this.pool.connect();
    await pgClient.query(`SET search_path TO ${this.dbConfig.schema}, public;`);
    this.backendPID = (await pgClient.query<{ "pg_backend_pid": number }>(`select pg_backend_pid()`)).rows[0].pg_backend_pid;
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

  public async cancel(pid: number) {
    await this.pool.query(`select pg_cancel_backend(${pid})`);
  }

  public async insertPart(polygon: PartRecord, pgClient: PoolClient): Promise<void> {
    const insertPartValues = Object.entries(polygon).map(([key, value]) => {
      // NOTICE: PostGIS versions prior to 3.0 do not support GeoJSON inserts, the user can change the geom representation to WKT before insertion
      if (this.dbConfig.insertGeometryAsWKT && key === 'geom') return `SRID=4326;${geojsonToWKT(polygon.geom)}`;

      if (INSERT_PART_FIELDS.includes(key)) return value;
    });
    const fieldsPlaceholders = INSERT_PART_FIELDS.map((_, index) => `$${index + 1}`);
    const query = `CALL \"${this.dbConfig.schema}\".${this.dbConfig.insertPartStoredProcedure}((${fieldsPlaceholders})::\"${this.dbConfig.schema}\".${this.dbConfig.insertPartRecord})`;

    await pgClient.query(query, insertPartValues);
  }

  public async updatePolygonParts(pgClient: PoolClient): Promise<void> {
    const query = `CALL \"${this.dbConfig.schema}\".${this.dbConfig.updatePolygonPartsStoredProcedure}()`;
    await pgClient.query(query);
  }

  private getPoolConfig(dbConfig: PGConfig): PoolConfig {
    const pgClientConfig: PoolConfig = {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      password: dbConfig.password,
    };

    if (dbConfig.sslEnabled) {
      pgClientConfig.ssl = {
        rejectUnauthorized: dbConfig.rejectUnauthorized,
        ca: readFileSync(dbConfig.sslPaths.ca),
        key: readFileSync(dbConfig.sslPaths.key),
        cert: readFileSync(dbConfig.sslPaths.cert),
      };
    }

    if (dbConfig.pool) {
      pgClientConfig.min = dbConfig.pool.min;
      pgClientConfig.max = dbConfig.pool.max;
    }

    return pgClientConfig;
  }
}
