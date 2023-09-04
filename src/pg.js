"use strict";
const pg = require("pg");
const config = require("config");
const fs = require("fs");

class DBProvider {
  constructor() {
    this.dbConfig = config.get("pgConfig");
    const pgClientConfig = {
      host: this.dbConfig.host,
      user: this.dbConfig.user,
      database: this.dbConfig.database,
      password: this.dbConfig.password,
    };

    if (this.dbConfig.sslEnabled) {
      pgClientConfig.ssl = {
        rejectUnauthorized: this.dbConfig.rejectUnauthorized,
        key: fs.readFileSync(this.dbConfig.sslPaths.key),
        cert: fs.readFileSync(this.dbConfig.sslPaths.cert),
        ca: fs.readFileSync(this.dbConfig.sslPaths.ca),
      };
    }

    this.pool = new pg.Pool(pgClientConfig);
  }

  async connectToDb() {
    const pgClient = await this.pool.connect();
    await pgClient.query(`SET search_path TO "${this.dbConfig.schema}",public`);
    return pgClient;
  }

  async insertPolygonPart(part) {
    const pgClient = await this.connectToDb();
    try {
      const params =
        '"recordId", "productId", "productName", "productVersion", "sourceStartDateUtc", "sourceEndDateUtc", "minResolutionDegree", "maxResolutionDegree", "minResolutionMeter", "maxResolutionMeter", "minHorizontalAccuracyCe90", sensors, region, classification, description, geom, "imageName", "productType"';
      const values = `'${part["recordId"]}','${part["productId"]}','${part["productName"]}','${part["productVersion"]}',to_date('${part["sourceStartDateUtc"]}','DD-MM-YYYY HH24:MI:SS'),to_date('${part["sourceEndDateUtc"]}','DD-MM-YYYY HH24:MI:SS'),${part["minResolutionDegree"]},${part["maxResolutionDegree"]},${part["minResolutionMeter"]},${part["maxResolutionMeter"]},${part["minHorizontalAccuracyCe90"]},'${part["sensors"]}','${part["region"]}',${part["classification"]},'${part["description"]}',ST_GeomFromGeoJSON('${JSON.stringify(part["geom"])}'),'${part["imageName"]}','${part["productType"]}'`;
      const query = `INSERT INTO ${this.dbConfig.table}(${params}) VALUES (${values})`;
      await pgClient.query(query);
      
    } catch (e) {
      console.log(e);
    } finally {
      pgClient.release();
    }
  }
}

module.exports = {
  DBProvider,
};