export const SUPPORTED_GEO_TYPES = ['MULTIPOLYGON', 'POLYGON'];

export const OPTIONAL_FIELDS = ['minHorizontalAccuracyCE90', 'maxHorizontalAccuracyCE90', 'description', 'imageName', 'minResolutionMeter', 'minResolutionDeg', 'sourceDateStart', 'region'] as const;
export const FIXED_FIELDS = ['productVersion'] as const;
export const REQUIRED_FIELDS = ['productId', 'recordId', 'classification', 'productType', 'srsName', 'maxResolutionMeter', 'sensors', 'productName', 'sourceDateEnd', 'maxResolutionDeg', 'geom'] as const;
export const ALL_FIELDS = [...REQUIRED_FIELDS, ...FIXED_FIELDS, ...OPTIONAL_FIELDS] as const;

export const VALIDATION_ERRORS = {
  mandatoryField: 'missing a mandatory field',
  domainValues: 'value should be one of',
  geometryType: 'Only MULTIPOLYGON and POLYGON geometry types are supported'
}
