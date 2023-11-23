export const SUPPORTED_GEO_TYPES = ['MULTIPOLYGON', 'POLYGON'];

export const OPTIONAL_FIELDS = ['minHorizontalAccuracyCE90', 'maxHorizontalAccuracyCE90', 'description', 'imageName', 'minResolutionMeter', 'minResolutionDeg', 'sourceDateStart', 'region', 'productVersion', 'productId', 'classification', 'sensors', 'productName'] as const;
export const REQUIRED_FIELDS = ['recordId', 'productType', 'srsName', 'maxResolutionMeter', 'sourceDateEnd', 'maxResolutionDeg', 'geom'] as const;
export const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;

export const INSERT_POLYGON_PART_FIELDS = ['recordId', 'productId', 'productName', 'productVersion', 'sourceDateStart', 'sourceDateEnd', 'minResolutionDeg', 'maxResolutionDeg', 'minResolutionMeter', 'maxResolutionMeter', 'minHorizontalAccuracyCE90', 'maxHorizontalAccuracyCE90', 'sensors', 'region', 'classification', 'description', 'geom', 'imageName', 'productType', 'srsName'];

export const VALIDATION_ERRORS = {
  mandatoryField: 'missing a mandatory field',
  domainValues: 'value should be one of',
  geometryType: 'Only MULTIPOLYGON and POLYGON geometry types are supported'
}
