import { getIO } from '../config/socket';
import { CheckStatus } from '@prisma/client';

/**
 * Emit real-time updates to connected clients
 */
export class WebSocketService {
  /**
   * Notify clients about a new health check result
   */
  static emitCheckUpdate(monitorId: string, check: {
    status: CheckStatus;
    statusCode?: number | null;
    responseTime?: number | null;
    checkedAt: Date;
  }): void {
    const io = getIO();
    io.to(`monitor:${monitorId}`).emit('check:update', {
      monitorId,
      check,
    });
  }

  /**
   * Notify clients about a new incident
   */
  static emitIncident(monitorId: string, incident: {
    id: string;
    status: 'OPEN' | 'RESOLVED';
    startedAt: Date;
    resolvedAt?: Date | null;
    downtime?: number | null;
  }): void {
    const io = getIO();
    io.to(`monitor:${monitorId}`).emit('incident:update', {
      monitorId,
      incident,
    });
  }

  /**
   * Notify user about all their monitors
   */
  static emitUserUpdate(userId: string, data: any): void {
    const io = getIO();
    io.to(`user:${userId}`).emit('user:update', data);
  }
}
