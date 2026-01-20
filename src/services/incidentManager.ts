import prisma from '../config/database';
import { CheckStatus } from '@prisma/client';

export class IncidentManager {
  /**
   * Check if we need to create or resolve an incident
   */
  static async processCheck(
    monitorId: string,
    checkStatus: CheckStatus
  ): Promise<string | null> {
    const isDown = checkStatus === 'DOWN' || checkStatus === 'TIMEOUT' || checkStatus === 'ERROR';
    
    // Get the latest incident for this monitor
    const latestIncident = await prisma.incident.findFirst({
      where: {
        monitorId,
        status: 'OPEN',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (isDown && !latestIncident) {
      // Create new incident
      const incident = await prisma.incident.create({
        data: {
          monitorId,
          status: 'OPEN',
          description: `Monitor went down. Status: ${checkStatus}`,
        },
      });
      return incident.id;
    }

    if (!isDown && latestIncident) {
      // Resolve incident and calculate downtime
      const downtime = Date.now() - latestIncident.startedAt.getTime();
      
      await prisma.incident.update({
        where: { id: latestIncident.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          downtime,
        },
      });
      
      return latestIncident.id;
    }

    return latestIncident?.id || null;
  }

  /**
   * Get incident statistics for a monitor
   */
  static async getIncidentStats(monitorId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const incidents = await prisma.incident.findMany({
      where: {
        monitorId,
        startedAt: {
          gte: since,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    const totalDowntime = incidents
      .filter((i) => i.downtime)
      .reduce((sum, i) => sum + (i.downtime || 0), 0);

    return {
      totalIncidents: incidents.length,
      openIncidents: incidents.filter((i) => i.status === 'OPEN').length,
      totalDowntime, // in milliseconds
      averageDowntime: incidents.length > 0 ? totalDowntime / incidents.length : 0,
      incidents,
    };
  }
}
