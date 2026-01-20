# 🏗 Architecture Overview

## System Components

### 1. API Server (`src/index.ts`, `src/server.ts`)
The main Express.js server that handles:
- REST API endpoints for all resources
- WebSocket server for real-time updates
- Authentication middleware
- Error handling
- Rate limiting

**Port**: 3000 (configurable)

### 2. Worker Service (`src/worker/`)
Separate process that handles background jobs:

#### Health Check Worker (`healthCheckWorker.ts`)
- Processes health check jobs from BullMQ queue
- Performs HTTP/HTTPS requests to monitor URLs
- Saves check results and metrics to database
- Triggers incident management
- Sends notifications on status changes
- Emits WebSocket updates

**Concurrency**: Configurable (default: 50 concurrent checks)

#### Scheduler (`scheduler.ts`)
- Runs every minute via cron
- Discovers all active monitors
- Schedules recurring health check jobs in BullMQ
- Ensures new monitors are automatically checked

### 3. Database Layer (PostgreSQL + Prisma)

#### Schema Design
- **Users**: Authentication and user management
- **Monitors**: Configuration for each monitored endpoint
- **Checks**: Individual health check results (time-series)
- **Incidents**: Downtime events with automatic resolution
- **Metrics**: Performance data (response times)
- **StatusPages**: Public status page configurations
- **NotificationSettings**: User notification preferences

#### Optimizations
- Indexes on `monitorId` + `checkedAt` for fast time-series queries
- Indexes on `status` for incident filtering
- Indexes on `userId` for user-specific queries
- Composite indexes for common query patterns

### 4. Queue System (BullMQ + Redis)

**Queue Name**: `health-check`

**Job Structure**:
```typescript
{
  monitorId: string;
  url: string;
  method: string;
  expectedStatus: number;
  timeout: number;
}
```

**Features**:
- Recurring jobs (every N milliseconds per monitor)
- Concurrency control (max parallel jobs)
- Rate limiting (1000 jobs/minute)
- Automatic retries on failure
- Job persistence in Redis

### 5. Real-time Communication (Socket.IO)

**Redis Adapter**: Enables horizontal scaling across multiple server instances

**Events**:
- `subscribe:monitor` - Subscribe to specific monitor updates
- `subscribe:user` - Subscribe to all user's monitors
- `check:update` - New health check result
- `incident:update` - Incident created or resolved

**Rooms**:
- `monitor:{monitorId}` - All clients watching a specific monitor
- `user:{userId}` - All clients for a user's dashboard

### 6. Notification System

**Channels**:
1. **Email** (SMTP via Nodemailer)
2. **Telegram** (Bot API)
3. **Webhook** (HTTP POST to custom URL)

**Trigger**: Only on status change (UP → DOWN or DOWN → UP)

**Payload**:
```typescript
{
  monitorId: string;
  monitorName: string;
  url: string;
  status: 'UP' | 'DOWN';
  incidentId?: string;
  error?: string;
}
```

## Data Flow

### Health Check Flow
```
1. Scheduler discovers active monitors
2. Creates recurring jobs in BullMQ queue
3. Worker picks up job
4. Performs HTTP request
5. Saves check result to database
6. Saves metric (response time)
7. IncidentManager processes status
8. If status changed:
   - Create/resolve incident
   - Send notifications
   - Emit WebSocket update
```

### Incident Management Flow
```
1. Check status is DOWN/TIMEOUT/ERROR
2. IncidentManager checks for open incident
3. If no open incident → Create new incident
4. If check status is UP and incident exists → Resolve incident
5. Calculate downtime (resolvedAt - startedAt)
6. Emit WebSocket update
7. Send notification
```

## Scalability

### Horizontal Scaling
- **API Servers**: Stateless, can run multiple instances
- **Workers**: Can run multiple worker processes/instances
- **Socket.IO**: Redis adapter enables multi-server WebSocket
- **Database**: PostgreSQL with connection pooling
- **Queue**: Redis handles distributed job queue

### Performance Optimizations
1. **Database Indexing**: Optimized for time-series queries
2. **Connection Pooling**: Prisma handles connection pooling
3. **Concurrency Control**: BullMQ limits parallel jobs
4. **Rate Limiting**: Prevents queue overload
5. **Caching**: Redis for session/queue data

## Security

1. **Authentication**: JWT tokens with expiration
2. **Password Hashing**: bcrypt with salt rounds
3. **Input Validation**: Zod schemas for all inputs
4. **Rate Limiting**: Express rate limiter
5. **Security Headers**: Helmet.js
6. **CORS**: Configurable CORS policy

## Monitoring & Observability

- Health check endpoint: `/health`
- Structured logging (console for now, can be extended)
- Error tracking in worker and API
- Database query logging in development

## Deployment

### Recommended Setup
- **API Server**: 2+ instances behind load balancer
- **Worker**: 1+ instances (scale based on monitor count)
- **Database**: PostgreSQL with read replicas (optional)
- **Redis**: Redis Cluster or Sentinel for HA
- **WebSocket**: Requires sticky sessions or Redis adapter (implemented)

### Environment Variables
See `.env.example` for all required configuration.

## Future Enhancements

Potential improvements:
- Metrics aggregation (hourly/daily summaries)
- Data retention policies (archive old checks)
- Advanced alerting rules (thresholds, patterns)
- Multi-region health checks
- SSL certificate monitoring
- API response validation
- Custom check scripts
