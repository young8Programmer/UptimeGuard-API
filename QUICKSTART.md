# 🚀 Quick Start Guide

## 1. Prerequisites

Make sure you have installed:
- Node.js 18+ 
- Docker and Docker Compose (optional, for local services)

## 2. Start Services (Docker)

If you want to use Docker for PostgreSQL and Redis:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379

## 3. Install Dependencies

```bash
npm install
```

## 4. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `DATABASE_URL="postgresql://uptimeguard:uptimeguard@localhost:5432/uptimeguard?schema=public"`
- `JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"`

## 5. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

## 6. Start the Application

You need **two terminals**:

### Terminal 1: API Server
```bash
npm run dev
```

### Terminal 2: Worker (Health Checks)
```bash
npm run worker
```

## 7. Test the API

### Register a user:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `token` from the response.

### Create a monitor:
```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Google",
    "url": "https://www.google.com",
    "interval": 30000
  }'
```

The worker will automatically start checking this monitor every 30 seconds!

## 8. Check Health

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 🎉 You're Ready!

Your UptimeGuard API is now running. The worker will automatically:
- Check all active monitors at their configured intervals
- Create incidents when monitors go down
- Resolve incidents when monitors come back up
- Calculate downtime automatically
- Send notifications (if configured)

## Next Steps

1. Set up notification settings (Email, Telegram, or Webhook)
2. Create a status page
3. Connect a frontend using the WebSocket API for real-time updates

## Troubleshooting

### Database connection error
- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Try: `npm run db:push` again

### Redis connection error
- Make sure Redis is running
- Check `REDIS_URL` in `.env`
- Default: `redis://localhost:6379`

### Worker not processing
- Make sure worker is running: `npm run worker`
- Check Redis connection
- Look for errors in worker terminal
