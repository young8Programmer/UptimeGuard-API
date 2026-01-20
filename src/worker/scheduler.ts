import { Queue } from 'bullmq';
import redis from '../config/redis';
import prisma from '../config/database';
import cron from 'node-cron';

const healthCheckQueue = new Queue('health-check', {
  connection: redis,
});

/**
 * Schedule health checks for all active monitors
 */
export const scheduleHealthChecks = async (): Promise<void> => {
  const activeMonitors = await prisma.monitor.findMany({
    where: {
      isActive: true,
    },
  });

  console.log(`📅 Scheduling ${activeMonitors.length} health checks...`);

  for (const monitor of activeMonitors) {
    // Check if job already exists for this monitor
    const existingJobs = await healthCheckQueue.getJobs(['waiting', 'delayed', 'active']);
    const hasJob = existingJobs.some(
      (job) => job.data.monitorId === monitor.id
    );

    if (!hasJob) {
      // Schedule recurring job
      await healthCheckQueue.add(
        `monitor-${monitor.id}`,
        {
          monitorId: monitor.id,
          url: monitor.url,
          method: monitor.method,
          expectedStatus: monitor.expectedStatus,
          timeout: monitor.timeout,
        },
        {
          repeat: {
            every: monitor.interval,
          },
          jobId: `monitor-${monitor.id}`,
        }
      );
    }
  }
};

/**
 * Start the scheduler cron job
 */
export const startScheduler = (): void => {
  // Run immediately on start
  scheduleHealthChecks();

  // Then run every minute to pick up new monitors
  cron.schedule('* * * * *', async () => {
    await scheduleHealthChecks();
  });

  console.log('✅ Scheduler started');
};
