import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      name: 'TeamSync API',
      status: 'ok',
      version: '1.0.0',
    };
  }
}
