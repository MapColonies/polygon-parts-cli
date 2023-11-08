export const SUPPORTED_GEO_TYPES = ['MULTIPOLYGON', 'POLYGON'];

export const optionalFields = ['minHorizontalAccuracyCe90', 'description', 'imageName'] as const;
export const fixedFields = ['productVersion'] as const;
export const requiredFields = ['productId', 'recordId', 'classification', 'productType', 'srsName', 'minResolutionDegree', 'minResolutionMeter', 'maxResolutionMeter', 'sensors', 'productName', 'sourceStartDateUtc', 'sourceEndDateUtc', 'maxResolutionDegree', 'region', 'geom'] as const;
export const allFields = [...requiredFields, ...fixedFields, ...optionalFields] as const;

export const classificationKeys = ['unclassified', 'confidential', 'secret', 'topsecret'] as const;
export const CLASSIFICATION_MAPPING: Record<typeof classificationKeys[number], number> = {
  unclassified: 6,
  confidential: 5,
  secret: 4,
  topsecret: 3,
};

export const productTypeKeys = ['orthophoto', 'orthophotohistory', 'orthophotobest', 'rastermap', 'rastermapbest', 'rasteraid', 'rasteraidbest', 'rastervector', 'rastervectorbest'] as const;
export const PRODUCT_TYPE_MAPPING: Record<typeof productTypeKeys[number], string> = {
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
