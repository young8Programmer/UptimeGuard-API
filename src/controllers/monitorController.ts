import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { z } from 'zod';
import { Queue } from 'bullmq';
import redis from '../config/redis';

const healthCheckQueue = new Queue('health-check', {
  connection: redis,
});

const createMonitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['HTTP', 'HTTPS', 'TCP', 'PING']).default('HTTP'),
  method: z.string().default('GET'),
  expectedStatus: z.number().int().default(200),
  interval: z.number().int().min(10000).default(30000),
  timeout: z.number().int().min(1000).default(10000),
});

const updateMonitorSchema = createMonitorSchema.partial();

export const createMonitor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createMonitorSchema.parse(req.body);
    const userId = req.user!.id;

    const monitor = await prisma.monitor.create({
      data: {
        ...data,
        userId,
      },
    });

    // Schedule health check immediately
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

    res.status(201).json({ monitor });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to create monitor' });
  }
};

export const getMonitors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const monitors = await prisma.monitor.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            checks: true,
            incidents: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ monitors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monitors' });
  }
};

export const getMonitor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const monitor = await prisma.monitor.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        checks: {
          take: 50,
          orderBy: {
            checkedAt: 'desc',
          },
        },
        incidents: {
          take: 10,
          orderBy: {
            startedAt: 'desc',
          },
        },
      },
    });

    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    // Get latest check
    const latestCheck = await prisma.check.findFirst({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
    });

    // Get metrics (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const metrics = await prisma.metric.findMany({
      where: {
        monitorId: id,
        timestamp: {
          gte: yesterday,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    res.json({
      monitor,
      latestCheck,
      metrics,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monitor' });
  }
};

export const updateMonitor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateMonitorSchema.parse(req.body);

    const monitor = await prisma.monitor.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const updated = await prisma.monitor.update({
      where: { id },
      data,
    });

    // Update scheduled job if interval changed
    if (data.interval) {
      const job = await healthCheckQueue.getJob(`monitor-${id}`);
      if (job) {
        await job.remove();
        await healthCheckQueue.add(
          `monitor-${id}`,
          {
            monitorId: id,
            url: updated.url,
            method: updated.method,
            expectedStatus: updated.expectedStatus,
            timeout: updated.timeout,
          },
          {
            repeat: {
              every: updated.interval,
            },
            jobId: `monitor-${id}`,
          }
        );
      }
    }

    res.json({ monitor: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to update monitor' });
  }
};

export const deleteMonitor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const monitor = await prisma.monitor.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    // Remove scheduled job
    const job = await healthCheckQueue.getJob(`monitor-${id}`);
    if (job) {
      await job.remove();
    }

    await prisma.monitor.delete({
      where: { id },
    });

    res.json({ message: 'Monitor deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete monitor' });
  }
};
