import type {
  IRasterCatalogUpsertRequestBody,
  PolygonPartsPayload as PolygonPartsPayloadType,
  ProductType as ProductTypeEnum,
} from "@map-colonies/mc-model-types";
import type { EnsureType } from "./types";
import { PRODUCT_TYPES } from "./constants";

/**
 * Polygon parts ingestion payload
 */
export interface PolygonPartsPayload
  extends Omit<PolygonPartsPayloadType, "productType"> {
  readonly productType: ProductType;
}

/**
 * Product type values acceptable for polygon parts
 */
export type ProductType = Extract<
  `${ProductTypeEnum}`,
  EnsureType<(typeof PRODUCT_TYPES)[number], `${ProductTypeEnum}`>
>;

export interface CSVRow {
  Source: string;
  SourceName: string;
  SensorType: string;
  Resolution: string;
  ResolutionMeter?: string;
  ResolutionDegree?: string;
  Ep90: string;
  Cities: string;
  Countries: string;
  Dsc: string;
  UpdateDate: string;
  WKT: string;
  PublishRes?: string;
}

export interface CatalogIdRow {
  catalogId: string;
}

export type LayerInfo = Required<IRasterCatalogUpsertRequestBody>;
