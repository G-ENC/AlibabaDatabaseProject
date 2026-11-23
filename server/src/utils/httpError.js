// Throw this anywhere; the error handler turns it into { error: message } with the status.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
