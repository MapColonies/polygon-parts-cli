export const SUPPORTED_GEO_TYPES = ["POLYGON"];

export const OPTIONAL_FIELDS = [
  "minHorizontalAccuracyCE90",
  "maxHorizontalAccuracyCE90",
  "description",
  "imageName",
  "minResolutionMeter",
  "minResolutionDegree",
  "sourceDateStartUTC",
  "region",
  "productVersion",
  "productId",
  "classification",
  "sensors",
  "productName",
] as const;

export const REQUIRED_FIELDS = [
  "recordId",
  "productType",
  "srsName",
  "maxResolutionMeter",
  "maxResolutionDegree",
  "sourceDateEndUTC",
  "geom",
] as const;

export const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

export const INSERT_PART_FIELDS = [
  "catalogId",
  "productId",
  "productName",
  "productVersion",
];

export const VALIDATION_ERRORS = {
  unsupportedHeader: "unsupported header",
  mandatoryField: "missing a mandatory field",
  domainValues: "value should be one of",
  geometryType: "Only MULTIPOLYGON and POLYGON geometry types are supported",
};

export const PRODUCT_TYPES = [
  "Orthophoto",
  "OrthophotoHistory",
  "OrthophotoBest",
  "RasterMap",
  "RasterMapBest",
  "RasterAid",
  "RasterAidBest",
  "RasterVector",
  "RasterVectorBest",
] as const;

export const REQUIRED_FIELDS_CSV = [
  "Source",
  "SourceName",
  "SensorType",
  "Resolution",
  "ResolutionMeter",
  "ResolutionDegree",
  "Ep90",
  "Cities",
  "Countries",
  "Dsc",
  "UpdateDate",
  "WKT",
] as const;
