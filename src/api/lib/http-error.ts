export class HttpError extends Error {
  httpCode: number;
  code?: string;

  constructor(message: string, httpCode: number, code?: string) {
    super(message);

    this.httpCode = httpCode;
    this.code = code;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = 'invalid payload', code?: string) {
    super(message, 400, code);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'not found', code?: string) {
    super(message, 404, code);
  }
}
