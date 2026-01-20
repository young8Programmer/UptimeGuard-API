# 🚀 UptimeGuard API

Professional SaaS backend for monitoring websites, APIs, and servers. This system provides distributed health checks, incident management, real-time notifications, and public status pages.

## ✨ Features

### Core Functionality
- **Distributed Health Checks**: Automatically checks all monitors at configurable intervals (default: 30 seconds)
- **Performance Metrics**: Tracks response times in milliseconds and stores time-series data
- **Incident Management**: Automatically creates incidents when monitors go down and calculates downtime
- **Real-time Updates**: WebSocket support for live status updates without page refresh
- **Notification Pipeline**: Supports Email, Telegram, and Webhook notifications
- **Public Status Pages**: Each user can create custom status pages (e.g., `status.kompaniya.uz`)

### Technical Highlights
- **Concurrency Control**: Uses BullMQ (Redis) for distributed job queues, handling 1000+ simultaneous checks
- **Time-Series Optimization**: PostgreSQL with proper indexing for efficient metric storage
- **Scalable Architecture**: Redis adapter for Socket.IO enables horizontal scaling
- **Type Safety**: Full TypeScript implementation with Prisma ORM

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: BullMQ with Redis
- **Real-time**: Socket.IO with Redis adapter
- **Authentication**: JWT
- **Notifications**: Nodemailer (Email), node-telegram-bot-api (Telegram)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+

## 🚀 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd uptimeguard-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters)
- Email/Telegram settings (optional)

4. **Set up the database**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

5. **Start the services**

In separate terminals:

```bash
# Terminal 1: Start API server
npm run dev

# Terminal 2: Start worker (for health checks)
npm run worker
```

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Monitors

All monitor endpoints require authentication (Bearer token).

#### Create Monitor
```http
POST /api/monitors
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Website",
  "url": "https://example.com",
  "type": "HTTP",
  "method": "GET",
  "expectedStatus": 200,
  "interval": 30000,
  "timeout": 10000
}
```

#### Get All Monitors
```http
GET /api/monitors
Authorization: Bearer <token>
```

#### Get Monitor Details
```http
GET /api/monitors/:id
Authorization: Bearer <token>
```

#### Update Monitor
```http
PUT /api/monitors/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "interval": 60000,
  "timeout": 15000
}
```

#### Delete Monitor
```http
DELETE /api/monitors/:id
Authorization: Bearer <token>
```

### Status Pages

#### Create Status Page
```http
POST /api/status-pages
Authorization: Bearer <token>
Content-Type: application/json

{
  "subdomain": "mycompany",
  "title": "My Company Status",
  "description": "Service status page",
  "isPublic": true
}
```

#### Get Public Status Page
```http
GET /api/status-pages/public/:subdomain
```

### Notifications

#### Get Notification Settings
```http
GET /api/notifications
Authorization: Bearer <token>
```

#### Update Notification Settings
```http
PUT /api/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": true,
  "telegram": true,
  "telegramChatId": "123456789",
  "webhook": true,
  "webhookUrl": "https://example.com/webhook"
}
```

## 🔌 WebSocket Events

Connect to the Socket.IO server and subscribe to updates:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Subscribe to monitor updates
socket.emit('subscribe:monitor', 'monitor-id');

// Listen for check updates
socket.on('check:update', (data) => {
  console.log('New check:', data);
});

// Listen for incident updates
socket.on('incident:update', (data) => {
  console.log('Incident update:', data);
});

// Subscribe to all user monitors
socket.emit('subscribe:user', 'user-id');

socket.on('user:update', (data) => {
  console.log('User update:', data);
});
```

## 🏗 Architecture

### Components

1. **API Server** (`src/index.ts`, `src/server.ts`)
   - REST API endpoints
   - WebSocket server
   - Authentication middleware

2. **Worker** (`src/worker/`)
   - Health check worker (BullMQ)
   - Scheduler for recurring checks
   - Processes jobs from Redis queue

3. **Services**
   - `healthCheck.ts`: Performs HTTP/HTTPS checks
   - `incidentManager.ts`: Manages incidents and downtime
   - `notifications.ts`: Sends notifications (Email, Telegram, Webhook)
   - `websocket.ts`: Real-time updates via Socket.IO

4. **Database Schema**
   - Users, Monitors, Checks, Incidents, Metrics
   - Status Pages, Notification Settings
   - Optimized indexes for time-series queries

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT secret key | Required (min 32 chars) |
| `HEALTH_CHECK_INTERVAL` | Default check interval (ms) | `30000` |
| `MAX_CONCURRENT_CHECKS` | Max parallel checks | `50` |
| `CHECK_TIMEOUT` | Request timeout (ms) | `10000` |

## 📊 Database Optimization

The schema includes optimized indexes for:
- Time-series queries on `Check` and `Metric` tables
- Fast lookups by `monitorId` and `userId`
- Efficient incident queries by status and date

## 🚦 Health Checks

The system automatically:
1. Schedules health checks for all active monitors
2. Performs checks at configured intervals
3. Stores results and metrics
4. Creates/resolves incidents automatically
5. Sends notifications on status changes
6. Emits real-time updates via WebSocket

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet.js for security headers
- Input validation with Zod

## 📝 Development

```bash
# Development mode (with hot reload)
npm run dev

# Worker mode
npm run worker

# Build for production
npm run build

# Start production server
npm start

# Database management
npm run db:studio  # Open Prisma Studio
npm run db:migrate # Run migrations
```

## 🐛 Troubleshooting

### Worker not processing jobs
- Ensure Redis is running and accessible
- Check `REDIS_URL` in `.env`
- Verify worker is started: `npm run worker`

### Database connection errors
- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Run `npm run db:push` to sync schema

### WebSocket not connecting
- Ensure Socket.IO server is initialized
- Check CORS settings if connecting from different origin
- Verify Redis adapter is connected

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for reliable uptime monitoring
