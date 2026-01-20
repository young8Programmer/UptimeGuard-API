import 'dotenv/config';
import { createHealthCheckWorker } from './healthCheckWorker';
import { startScheduler } from './scheduler';

console.log('🚀 Starting UptimeGuard Worker...');

// Start the health check worker
const worker = createHealthCheckWorker();
console.log('✅ Health Check Worker started');

// Start the scheduler
startScheduler();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down worker...');
  await worker.close();
  process.exit(0);
});
