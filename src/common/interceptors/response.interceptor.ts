import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw) return next.handle();

    return next.handle().pipe(
      map((result: any) => {
        if (result?.success !== undefined) return result;
        if (result?.data !== undefined && result?.meta !== undefined) {
          return {
            success: true,
            data: result.data,
            meta: result.meta,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: true,
          data: result ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
