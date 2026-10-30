export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {any} [details]
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = 'Bad Request', details = null) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new HttpError(401, message, details);
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new HttpError(403, message, details);
  }

  static notFound(message = 'Not Found', details = null) {
    return new HttpError(404, message, details);
  }

  static conflict(message = 'Conflict', details = null) {
    return new HttpError(409, message, details);
  }

  static unprocessable(message = 'Unprocessable Entity', details = null) {
    return new HttpError(422, message, details);
  }

  static internal(message = 'Internal Server Error', details = null) {
    return new HttpError(500, message, details);
  }
}
