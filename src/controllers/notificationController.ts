import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { z } from 'zod';

const updateNotificationSchema = z.object({
  email: z.boolean().optional(),
  telegram: z.boolean().optional(),
  webhook: z.boolean().optional(),
  telegramChatId: z.string().optional(),
  webhookUrl: z.string().url().optional(),
});

export const getNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = updateNotificationSchema.parse(req.body);

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          userId,
          ...data,
        },
      });
    } else {
      settings = await prisma.notificationSettings.update({
        where: { userId },
        data,
      });
    }

    res.json({ settings });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
};
