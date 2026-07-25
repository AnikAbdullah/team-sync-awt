import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof payload === 'string'
        ? payload
        : Array.isArray((payload as any)?.message)
          ? (payload as any).message
          : (payload as any)?.message ?? 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      error:
        (payload as any)?.error ??
        (exception instanceof Error ? exception.name : 'Error'),
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
