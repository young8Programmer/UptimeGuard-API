import 'dotenv/config';
import server from './server';
import { env } from './config/env';
import prisma from './config/database';
import redis from './config/redis';

const PORT = parseInt(env.PORT);

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  
  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 UptimeGuard API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port ${PORT}
✅ Environment: ${env.NODE_ENV}
✅ Database: Connected
✅ Redis: Connected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
