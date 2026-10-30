import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { partnerInspectionSchema } from '../schemas/verification.schema.js';
import {
  getPartnerAssignments,
  partnerInspection,
} from '../services/verification.service.js';

export const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await getPartnerAssignments(req.user.id);
  res.json({
    status: 'success',
    data: assignments,
  });
});

export const submitInspection = asyncHandler(async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    throw new HttpError(400, 'Invalid assignment ID');
  }

  const parsed = partnerInspectionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid inspection payload', parsed.error.format());
  }

  const result = await partnerInspection({
    assignmentId,
    partnerUser: req.user,
    inspectionData: parsed.data,
    idempotencyKey: req.headers['idempotency-key'],
  });

  res.json({
    status: 'success',
    message: `Field inspection submitted (${parsed.data.outcome})`,
    data: result,
  });
});
