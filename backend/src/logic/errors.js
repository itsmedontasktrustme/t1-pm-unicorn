/*
 * API errors. Every error answer has the same shape: { ok: false, code, error }.
 * `error` is the text shown to the resident (wording from the user stories),
 * `code` lets the frontend pick the right state (HK-94 / HK-97).
 */

class ApiError extends Error {
  constructor(status, code, message, fields = null) {
    super(message);
    this.status = status;
    this.code = code;
    // Optional texts per form field, e.g. { name: "...", description: "..." }.
    this.fields = fields;
  }

  toJSON() {
    return { ok: false, code: this.code, error: this.message, ...(this.fields ? { fields: this.fields } : {}) };
  }
}

const badRequest = (message, code = "invalid", fields = null) => new ApiError(400, code, message, fields);
const forbidden = (message, code = "forbidden") => new ApiError(403, code, message);
const notFound = (message, code = "not-found") => new ApiError(404, code, message);
const conflict = (message, code = "conflict") => new ApiError(409, code, message);

/** Wraps an async route handler so a thrown ApiError becomes the JSON answer. */
function handle(fn) {
  return async function(req, res, next) {
    try {
      const body = await fn(req, res);
      if (!res.headersSent) {
        res.status(200).json({ ok: true, ...body });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json(error.toJSON());
      }
      return next(error);
    }
  };
}

module.exports = { ApiError, badRequest, forbidden, notFound, conflict, handle };
