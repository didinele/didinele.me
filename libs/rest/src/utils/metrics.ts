/* istanbul ignore file */

import { Histogram } from 'prom-client';
import { container } from 'tsyringe';
import { Logger } from 'winston';
import { kLogger } from '@didinele.me/injection';
import type { Request, Response, NextHandler } from 'polka';

export const responseTimes = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  // buckets for response time from 1ms to 500ms
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5]
});

export const requestSizes = new Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route', 'code'],
  // buckets for request size from 5 bytes to 10000 bytes
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

export const responseSizes = new Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP response in bytes',
  labelNames: ['method', 'route', 'code'],
  // buckets for response size from 5 bytes to 10000 bytes
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

export const collectServerMetrics = () => {
  const logger = container.resolve<Logger>(kLogger);
  return (req: Request, res: Response, next: NextHandler) => {
  // Pointless to log metrics collection every 15 seconds.
    if (req.originalUrl !== '/metrics') {
      const endTimer = responseTimes.startTimer({ method: req.method.toUpperCase(), route: req.path });
      setTimeout(() => {
        endTimer();
        req.removeAllListeners('close');
      }, 15000);

      req.once('close', () => {
        const responseLength = parseInt((res.getHeader('content-length') ?? '0') as string, 10);
        requestSizes.observe(
          { method: req.method, route: req.path, code: res.statusCode }, parseInt(req.headers['content-length'] ?? '0', 10)
        );

        responseSizes.observe({ method: req.method, route: req.path, code: res.statusCode }, responseLength);
        const end = endTimer({ code: res.statusCode });

        logger.info(
          `${req.method.toUpperCase()} ${req.originalUrl}`,
          {
            topic: 'REQUEST COMPLETION',
            time: end / 1000,
            status: res.statusCode,
            statusText: res.statusMessage,
            body: req.body,
            params: req.params,
            query: req.query
          }
        );
      });
    }

    return next();
  };
};
