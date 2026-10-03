export class HttpError extends Error {
  httpCode: number;
  code?: string;
  errors?: unknown;

  constructor(message: string, httpCode: number, code?: string, errors?: unknown) {
    super(message);

    this.httpCode = httpCode;
    this.code = code;
    this.errors = errors;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'invalid payload', code?: string, errors?: unknown) {
    super(message, 400, code, errors);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'not found', code?: string) {
    super(message, 404, code);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = 'data conflict', code?: string) {
    super(message, 409, code);
  }
}
