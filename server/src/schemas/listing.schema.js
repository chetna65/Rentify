import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const listingIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Listing ID is required' })
    .regex(UUID_REGEX, 'Invalid listing UUID format'),
});

export const listingQuerySchema = z.object({
  city: z.string().trim().optional(),
  types: z.string().trim().optional(), // Comma-delimited property types: e.g. "1RK,2BHK"
  maxRent: z.coerce.number().positive('maxRent must be greater than 0').optional(),
  verifiedOnly: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .transform((val) => val === true || val === 'true' || val === '1')
    .optional(),
  locality: z.string().trim().optional(),
  q: z.string().trim().optional(),
  sort: z.enum(['recommender', 'price-asc', 'price-desc', 'safety']).default('recommender'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const vendorCreateListingSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  city: z.string().trim().min(2, 'City is required').max(60),
  locality: z.string().trim().min(2, 'Locality is required').max(160),
  propertyType: z.enum(['1RK', '1BHK', '2BHK', '3BHK', '4BHK'], {
    errorMap: () => ({ message: 'Property type must be 1RK, 1BHK, 2BHK, 3BHK, or 4BHK' }),
  }),
  rent: z.coerce.number().int().positive('Rent must be greater than 0'),
  deposit: z.coerce.number().int().nonnegative('Deposit cannot be negative'),
  furnishing: z.enum(['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], {
    errorMap: () => ({ message: 'Furnishing must be Unfurnished, Semi-Furnished, or Fully Furnished' }),
  }),
  carpetArea: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === 'number') return val;
      const num = parseInt(val, 10);
      return isNaN(num) ? null : num;
    })
    .optional(),
  floor: z.string().trim().max(100).optional(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  amenities: z
    .union([z.string(), z.array(z.any())])
    .transform((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return Array.isArray(val) ? val : [];
    })
    .optional()
    .default([]),
  docType: z.string().trim().optional(),
  docNumber: z.string().trim().optional(),
  documents: z
    .union([z.string(), z.array(z.any())])
    .transform((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }
      return Array.isArray(val) ? val : [];
    })
    .optional()
    .default([]),
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().trim().max(1000, 'Comment cannot exceed 1000 characters').optional().nullable(),
});

export const recommendationQuerySchema = z.object({
  city: z.string().trim().optional(),
  minRent: z.coerce.number().nonnegative().optional(),
  maxRent: z.coerce.number().positive().optional(),
  localities: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (Array.isArray(val)) return val;
      return typeof val === 'string'
        ? val.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    })
    .optional(),
});
