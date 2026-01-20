import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: User;
}

export interface HealthCheckResult {
  status: 'UP' | 'DOWN' | 'TIMEOUT' | 'ERROR';
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export interface NotificationPayload {
  monitorId: string;
  monitorName: string;
  url: string;
  status: 'UP' | 'DOWN';
  incidentId?: string;
  error?: string;
}
