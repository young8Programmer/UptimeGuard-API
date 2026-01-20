import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { z } from 'zod';

const createStatusPageSchema = z.object({
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
  customDomain: z.string().optional(),
  theme: z.string().default('default'),
});

export const createStatusPage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createStatusPageSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if subdomain is taken
    const existing = await prisma.statusPage.findUnique({
      where: { subdomain: data.subdomain },
    });

    if (existing) {
      res.status(400).json({ error: 'Subdomain already taken' });
      return;
    }

    const statusPage = await prisma.statusPage.create({
      data: {
        ...data,
        userId,
      },
    });

    res.status(201).json({ statusPage });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to create status page' });
  }
};

export const getStatusPages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const statusPages = await prisma.statusPage.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ statusPages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status pages' });
  }
};

export const getPublicStatusPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subdomain } = req.params;

    const statusPage = await prisma.statusPage.findUnique({
      where: { subdomain },
      include: {
        user: {
          include: {
            monitors: {
              where: {
                isActive: true,
              },
              include: {
                checks: {
                  take: 1,
                  orderBy: {
                    checkedAt: 'desc',
                  },
                },
                incidents: {
                  where: {
                    status: 'OPEN',
                  },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    if (!statusPage || !statusPage.isPublic) {
      res.status(404).json({ error: 'Status page not found' });
      return;
    }

    // Format data for public display
    const monitors = statusPage.user.monitors.map((monitor) => {
      const latestCheck = monitor.checks[0];
      return {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
        status: latestCheck?.status || 'UNKNOWN',
        lastCheck: latestCheck?.checkedAt || null,
        openIncidents: monitor.incidents.length,
      };
    });

    res.json({
      statusPage: {
        title: statusPage.title,
        description: statusPage.description,
        theme: statusPage.theme,
      },
      monitors,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status page' });
  }
};
