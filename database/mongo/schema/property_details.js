// MongoDB collection `property_details`: flexible, non-authoritative property content.
// _id is the SAME UUID as MySQL listings.id. Core fields (owner, city, rent, deposit, status, seal, ratings)
// live ONLY in MySQL; additionalProperties:false below stops them being copied here and drifting.

const uuidPattern = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

export const COLLECTION = 'property_details';
export const SCHEMA_VERSION = 1;

export const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'schemaVersion', 'metadata'],
    additionalProperties: false,
    properties: {
      _id: { bsonType: 'string', pattern: uuidPattern, description: 'Shared property UUID = MySQL listings.id' },
      schemaVersion: { bsonType: 'int', minimum: 1 },
      description: { bsonType: 'string', maxLength: 5000 },
      amenities: {
        bsonType: 'array', maxItems: 50,
        items: {
          bsonType: 'object', required: ['category', 'name'], additionalProperties: false,
          properties: {
            category: { enum: ['education', 'healthcare', 'transit', 'market', 'safety', 'other'] },
            name: { bsonType: 'string', maxLength: 200 },
            distanceKm: { bsonType: ['double', 'int'], minimum: 0, maximum: 500 },
            distanceLabel: { bsonType: 'string', maxLength: 60 },
          },
        },
      },
      safety: {
        bsonType: 'object', additionalProperties: false,
        properties: {
          score: { bsonType: ['double', 'int'], minimum: 0, maximum: 10 },
          note: { bsonType: 'string', maxLength: 2000 },
          source: { bsonType: 'string', maxLength: 60 },
        },
      },
      images: {
        bsonType: 'array', maxItems: 30,
        items: {
          bsonType: 'object', additionalProperties: false,
          // an image is either an external URL (demo only) or a storage key for an uploaded file
          anyOf: [{ required: ['url'] }, { required: ['storageKey'] }],
          properties: {
            url: { bsonType: 'string', pattern: '^https://', maxLength: 500 },
            storageKey: { bsonType: 'string', maxLength: 255 },
            caption: { bsonType: 'string', maxLength: 200 },
            isPrimary: { bsonType: 'bool' },
            sortOrder: { bsonType: 'int', minimum: 0 },
            source: { enum: ['owner_upload', 'partner_upload', 'demo_placeholder'] },
          },
        },
      },
      tags: { bsonType: 'array', maxItems: 30, items: { bsonType: 'string', maxLength: 40 } },
      attributes: { bsonType: 'object', description: 'Free-form extras: facing, parking, rules, ...' },
      metadata: {
        bsonType: 'object', required: ['isSynthetic', 'dataSource', 'createdAt'], additionalProperties: false,
        properties: {
          isSynthetic: { bsonType: 'bool' },
          dataSource: { bsonType: 'string', maxLength: 40 },
          importBatch: { bsonType: 'string', maxLength: 60 },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
        },
      },
    },
  },
};

export const indexes = [
  { key: { 'metadata.isSynthetic': 1 }, name: 'idx_synthetic' },
  { key: { tags: 1 }, name: 'idx_tags' },
  { key: { 'amenities.category': 1, 'amenities.distanceKm': 1 }, name: 'idx_amenity_category_distance' },
];
