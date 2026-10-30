import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { listingIdParamSchema, feedbackSchema } from '../schemas/listing.schema.js';
import { submitFeedback } from '../services/feedback.service.js';

export const postFeedback = asyncHandler(async (req, res) => {
  const paramParsed = listingIdParamSchema.safeParse(req.params);
  if (!paramParsed.success) {
    throw new HttpError(400, 'Invalid listing UUID format');
  }

  const bodyParsed = feedbackSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    throw new HttpError(400, 'Invalid feedback payload', bodyParsed.error.format());
  }

  const result = await submitFeedback({
    listingId: paramParsed.data.id,
    customerUser: req.user,
    rating: bodyParsed.data.rating,
    comment: bodyParsed.data.comment,
  });

  res.status(201).json({
    status: 'success',
    message: 'Feedback submitted successfully',
    data: result,
  });
});
