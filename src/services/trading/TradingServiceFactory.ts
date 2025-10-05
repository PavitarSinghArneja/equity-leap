import { TradingService } from './TradingService';
import type { TradingServiceConfig } from './types';

export class TradingServiceFactory {
  static create(config?: TradingServiceConfig) {
    return new TradingService({ enableLogging: false, ...config });
  }
}

