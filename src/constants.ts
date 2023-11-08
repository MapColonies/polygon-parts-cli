export const SUPPORTED_GEO_TYPES = ['MULTIPOLYGON', 'POLYGON'];

export const OPTIONAL_FIELDS = ['minHorizontalAccuracyCe90', 'description', 'imageName'] as const;
export const FIXED_FIELDS = ['productVersion'] as const;
export const REQUIRED_FIELDS = ['productId', 'recordId', 'classification', 'productType', 'srsName', 'minResolutionDegree', 'minResolutionMeter', 'maxResolutionMeter', 'sensors', 'productName', 'sourceStartDateUtc', 'sourceEndDateUtc', 'maxResolutionDegree', 'region', 'geom'] as const;
export const ALL_FIELDS = [...REQUIRED_FIELDS, ...FIXED_FIELDS, ...OPTIONAL_FIELDS] as const;

export const CLASSIFICATION_KEYS = ['unclassified', 'confidential', 'secret', 'topsecret'] as const;
export const CLASSIFICATION_MAPPING: Record<typeof CLASSIFICATION_KEYS[number], number> = {
  unclassified: 6,
  confidential: 5,
  secret: 4,
  topsecret: 3,
};

export const PRODUCT_TYPE_KEYS = ['orthophoto', 'orthophotohistory', 'orthophotobest', 'rastermap', 'rastermapbest', 'rasteraid', 'rasteraidbest', 'rastervector', 'rastervectorbest'] as const;
export const PRODUCT_TYPE_MAPPING: Record<typeof PRODUCT_TYPE_KEYS[number], string> = {
  orthophoto: 'Orthophoto',
  orthophotohistory: 'OrthophotoHistory',
  orthophotobest: 'OrthophotoBest',
  rastermap: 'RasterMap',
  rastermapbest: 'RasterMapBest',
  rasteraid: 'RasterAid',
  rasteraidbest: 'RasterAidBest',
  rastervector: 'RasterVector',
  rastervectorbest: 'RasterVectorBest',
};

export const VALIDATION_ERRORS = {
  mandatoryField: 'missing a mandatory field',
  domainValues: 'value should be one of',
  geometryType: 'Only MULTIPOLYGON and POLYGON geometry types are supported'
}
