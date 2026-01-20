import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import prisma from '../config/database';
import { performHealthCheck } from '../services/healthCheck';
import { IncidentManager } from '../services/incidentManager';
import { notificationService } from '../services/notifications';
import { WebSocketService } from '../services/websocket';
import { CheckStatus } from '@prisma/client';

interface HealthCheckJobData {
  monitorId: string;
  url: string;
  method: string;
  expectedStatus: number;
  timeout: number;
}

export const createHealthCheckWorker = (): Worker => {
  const worker = new Worker<HealthCheckJobData>(
    'health-check',
    async (job: Job<HealthCheckJobData>) => {
      const { monitorId, url, method, expectedStatus, timeout } = job.data;

      // Perform the health check
      const result = await performHealthCheck(url, method, timeout);

      // Determine check status
      let checkStatus: CheckStatus = 'UP';
      if (result.status === 'DOWN' || result.status === 'TIMEOUT' || result.status === 'ERROR') {
        checkStatus = result.status as CheckStatus;
      } else if (result.statusCode && result.statusCode !== expectedStatus) {
        checkStatus = 'DOWN';
      }

      // Save check result to database
      const check = await prisma.check.create({
        data: {
          monitorId,
          status: checkStatus,
          statusCode: result.statusCode || null,
          responseTime: result.responseTime || null,
          error: result.error || null,
        },
      });

      // Save performance metric (only if we have response time)
      if (result.responseTime) {
        await prisma.metric.create({
          data: {
            monitorId,
            responseTime: result.responseTime,
          },
        });
      }

      // Process incident (create or resolve)
      const incidentId = await IncidentManager.processCheck(monitorId, checkStatus);

      // Emit WebSocket update
      WebSocketService.emitCheckUpdate(monitorId, {
        status: checkStatus,
        statusCode: result.statusCode || null,
        responseTime: result.responseTime || null,
        checkedAt: check.checkedAt,
      });

      // If incident was created or resolved, emit incident update
      if (incidentId) {
        const incident = await prisma.incident.findUnique({
          where: { id: incidentId },
        });
        if (incident) {
          WebSocketService.emitIncident(monitorId, {
            id: incident.id,
            status: incident.status,
            startedAt: incident.startedAt,
            resolvedAt: incident.resolvedAt,
            downtime: incident.downtime,
          });
        }
      }

      // Send notifications if status changed
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
      });

      if (monitor) {
        const previousCheck = await prisma.check.findFirst({
          where: {
            monitorId,
            id: { not: check.id },
          },
          orderBy: {
            checkedAt: 'desc',
          },
        });

        // Notify if status changed
        if (!previousCheck || previousCheck.status !== checkStatus) {
          await notificationService.sendNotifications({
            monitorId,
            monitorName: monitor.name,
            url: monitor.url,
            status: checkStatus === 'UP' ? 'UP' : 'DOWN',
            incidentId: incidentId || undefined,
            error: result.error,
          });
        }
      }

      return {
        checkId: check.id,
        status: checkStatus,
        responseTime: result.responseTime,
        incidentId,
      };
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.MAX_CONCURRENT_CHECKS || '50'),
      limiter: {
        max: 1000,
        duration: 60000, // 1000 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Health check completed for monitor ${job.data.monitorId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Health check failed for monitor ${job?.data.monitorId}:`, err);
  });

  return worker;
};
