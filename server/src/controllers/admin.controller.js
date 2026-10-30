import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import {
  adminAssignSchema,
  adminDecisionSchema,
  queueQuerySchema,
  auditQuerySchema,
} from '../schemas/verification.schema.js';
import {
  getAdminQueue,
  assignPartner,
  adminDecision,
  getAdminPartners,
  getAuditLogs,
} from '../services/verification.service.js';
import { getListingById } from '../services/listing.service.js';
import { computeFraudSignals } from '../services/fraud.service.js';

const idParamSchema = z.string().uuid('Listing ID must be a valid UUID');

export const getQueue = asyncHandler(async (req, res) => {
  const parsed = queueQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid queue query parameters', parsed.error.format());
  }

  const result = await getAdminQueue(parsed.data);
  res.json({
    status: 'success',
    data: result,
  });
});

export const assign = asyncHandler(async (req, res) => {
  const idCheck = idParamSchema.safeParse(req.params.id);
  if (!idCheck.success) {
    throw new HttpError(400, 'Listing ID must be a valid UUID');
  }

  const parsed = adminAssignSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid assignment parameters', parsed.error.format());
  }

  const result = await assignPartner({
    listingId: idCheck.data,
    partnerId: parsed.data.partnerId,
    scheduledFor: parsed.data.scheduledFor,
    notes: parsed.data.notes,
    adminUser: req.user,
    idempotencyKey: req.headers['idempotency-key'],
  });

  res.json({
    status: 'success',
    message: 'Partner assigned successfully',
    data: result,
  });
});

export const decision = asyncHandler(async (req, res) => {
  const idCheck = idParamSchema.safeParse(req.params.id);
  if (!idCheck.success) {
    throw new HttpError(400, 'Listing ID must be a valid UUID');
  }

  const parsed = adminDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid decision parameters', parsed.error.format());
  }

  const result = await adminDecision({
    listingId: idCheck.data,
    decision: parsed.data.decision,
    reason: parsed.data.reason,
    flagCategory: parsed.data.flagCategory,
    adminUser: req.user,
    idempotencyKey: req.headers['idempotency-key'],
  });

  res.json({
    status: 'success',
    message: `Listing ${parsed.data.decision} successfully`,
    data: result,
  });
});

export const getPartners = asyncHandler(async (req, res) => {
  const partners = await getAdminPartners();
  res.json({
    status: 'success',
    data: partners,
  });
});

export const getAudit = asyncHandler(async (req, res) => {
  const parsed = auditQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid audit query parameters', parsed.error.format());
  }

  const result = await getAuditLogs(parsed.data);
  res.json({
    status: 'success',
    data: result,
  });
});

export const getListingDetails = asyncHandler(async (req, res) => {
  const idCheck = idParamSchema.safeParse(req.params.id);
  if (!idCheck.success) {
    throw new HttpError(400, 'Listing ID must be a valid UUID');
  }

  const listing = await getListingById(idCheck.data);
  if (!listing) {
    throw new HttpError(404, `Listing not found with ID ${idCheck.data}`);
  }

  const fraudSignals = await computeFraudSignals(idCheck.data);

  res.json({
    status: 'success',
    data: {
      ...listing,
      fraudSignals,
    },
    listing,
    fraudSignals,
  });
});
