import { z } from 'zod';

export const adminAssignSchema = z.object({
  partnerId: z.string().uuid('Invalid partner ID UUID'),
  scheduledFor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'scheduledFor must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const adminDecisionSchema = z
  .object({
    decision: z.enum(['verified', 'flagged'], {
      errorMap: () => ({ message: "decision must be either 'verified' or 'flagged'" }),
    }),
    reason: z.string().max(1000).optional().nullable(),
    flagCategory: z.string().max(120).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === 'flagged') {
      if (!data.reason || data.reason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'reason is required when decision is flagged',
          path: ['reason'],
        });
      }
    }
  });

export const partnerInspectionSchema = z
  .object({
    outcome: z.enum(['verified', 'flagged'], {
      errorMap: () => ({ message: "outcome must be either 'verified' or 'flagged'" }),
    }),
    gpsLat: z.number().min(6).max(38).optional().nullable(),
    gpsLng: z.number().min(68).max(98).optional().nullable(),
    physicalKeysVerified: z.boolean().optional().nullable(),
    ownerMetInPerson: z.boolean().optional().nullable(),
    unitVacantAvailable: z.boolean().optional().nullable(),
    notes: z.string().min(1, 'notes are required').max(2000),
    flagReason: z.string().max(1000).optional().nullable(),
    flagCategory: z.string().max(120).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Both GPS coordinates must be present or both must be null
    const hasLat = data.gpsLat !== null && data.gpsLat !== undefined;
    const hasLng = data.gpsLng !== null && data.gpsLng !== undefined;
    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Both gpsLat and gpsLng must be provided together, or both omitted',
        path: ['gpsLat'],
      });
    }

    if (data.outcome === 'flagged') {
      const reason = data.flagReason || data.notes;
      if (!reason || reason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'flagReason or descriptive notes are required when outcome is flagged',
          path: ['flagReason'],
        });
      }
    }
  });

export const queueQuerySchema = z.object({
  status: z.enum(['pending', 'in-review', 'verified', 'flagged']).default('pending'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const auditQuerySchema = z.object({
  listingId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
