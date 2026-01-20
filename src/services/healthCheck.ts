import { HealthCheckResult } from '../types';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export const performHealthCheck = async (
  url: string,
  method: string = 'GET',
  timeout: number = 10000
): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method.toUpperCase(),
        timeout,
        headers: {
          'User-Agent': 'UptimeGuard/1.0',
        },
      };

      const timeoutId = setTimeout(() => {
        req.destroy();
        resolve({
          status: 'TIMEOUT',
          responseTime: Date.now() - startTime,
        });
      }, timeout);

      const req = client.request(options, (res) => {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            status: res.statusCode === 200 ? 'UP' : 'DOWN',
            statusCode: res.statusCode || undefined,
            responseTime,
          });
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          status: 'ERROR',
          responseTime: Date.now() - startTime,
          error: error.message,
        });
      });

      req.end();
    } catch (error: any) {
      resolve({
        status: 'ERROR',
        responseTime: Date.now() - startTime,
        error: error.message || 'Unknown error',
      });
    }
  });
};
