import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BusinessError } from '../errors';

interface ErrorPayload {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  method: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const payload = this.toPayload(exception, request);

    if (payload.statusCode >= 500) {
      this.logger.error(`${payload.method} ${payload.path} → ${payload.statusCode}`, exception);
    } else {
      this.logger.warn(
        `${payload.method} ${payload.path} → ${payload.statusCode} (${payload.code})`,
      );
    }

    response.status(payload.statusCode).json(payload);
  }

  private toPayload(exception: unknown, request: Request): ErrorPayload {
    const base = {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof BusinessError) {
      return {
        ...base,
        statusCode: HttpStatus.BAD_REQUEST,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string }).message ?? exception.message);
      const code = this.codeFromStatus(status);
      const details =
        typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : undefined;
      return { ...base, statusCode: status, code, message, details };
    }

    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'internal_error',
      message: 'Unexpected server error',
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'bad_request';
      case 401:
        return 'unauthorized';
      case 403:
        return 'forbidden';
      case 404:
        return 'not_found';
      case 409:
        return 'conflict';
      default:
        return 'http_error';
    }
  }
}
