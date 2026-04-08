# PappyBot V2 - Production Ready

Stable, production-ready WhatsApp/Telegram bot with AI integration.

## Features

- ✅ WhatsApp integration via Baileys
- ✅ Telegram control panel
- ✅ BullMQ job queue with Redis
- ✅ MongoDB persistence
- ✅ OpenRouter AI integration
- ✅ Automatic reconnection
- ✅ Error recovery
- ✅ Structured logging
- ✅ Docker support

## Requirements

- Node.js 18+
- MongoDB
- Redis
- Telegram Bot Token
- OpenRouter API Key

## Installation

### Local Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Create data directories
mkdir -p data/session data/logs

# Start bot
npm start
```

### Docker Setup

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f pappybot

# Stop services
docker-compose down
```

### PM2 Setup

```bash
# Install PM2
npm install -g pm2

# Start with PM2
npm run pm2

# View logs
pm2 logs pappybot-v2

# Monitor
pm2 monit

# Stop
pm2 stop pappybot-v2
```

## Configuration

Edit `.env` file:

```env
# Bot Configuration
TG_BOT_TOKEN=your_telegram_bot_token
OWNER_TG_ID=your_telegram_user_id
OWNER_WA_JID=your_whatsapp_jid

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# MongoDB
MONGO_URI=mongodb://user:pass@localhost:27017/pappybot

# AI
OPENROUTER_API_KEY=your_openrouter_key

# System
NODE_ENV=production
LOG_LEVEL=info
MAX_RETRIES=3
```

## Usage

### Telegram Commands

- `/start` - Show control panel
- `/status` - Check bot status
- `/pair [phone]` - Link WhatsApp number
- `/logs` - View recent logs

### WhatsApp Commands

- `.menu` - Show command menu
- `.ai [prompt]` - Ask AI
- `.ping` - Check bot status
- `.help` - Get help

## Architecture

```
src/
├── main.js              # Entry point
├── handlers/
│   ├── whatsapp.js      # WhatsApp connection & events
│   └── telegram.js      # Telegram bot
├── services/
│   ├── queue.js         # BullMQ job queue
│   ├── ai.js            # AI service
│   └── commandRouter.js # Command handler
├── storage/
│   ├── database.js      # MongoDB connection
│   ├── redis.js         # Redis connection
│   └── models.js        # Mongoose models
└── utils/
    ├── logger.js        # Structured logging
    ├── config.js        # Configuration validator
    └── retry.js         # Retry utility
```

## Error Handling

- All network calls wrapped in try/catch
- Automatic retry with exponential backoff
- Graceful shutdown on SIGINT/SIGTERM
- EPIPE/ECONNRESET errors silently handled
- Database reconnection on disconnect
- WhatsApp auto-reconnect with rate limit handling

## Logging

Logs are written to:
- Console (development)
- `data/logs/pm2-*.log` (PM2)
- Structured JSON format (production)

Log levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`

## Monitoring

```bash
# Check process
ps aux | grep node

# View logs
tail -f data/logs/pm2-out.log

# Check memory
free -h

# Check disk
df -h
```

## Troubleshooting

### Bot won't connect to WhatsApp

1. Check session files exist in `data/session/`
2. Use `/pair` command in Telegram
3. Check for 440 rate limit errors in logs
4. Wait 5-30 minutes if rate limited

### Database connection fails

1. Verify MongoDB is running
2. Check MONGO_URI in .env
3. Test connection: `mongosh "your_mongo_uri"`

### Redis connection fails

1. Verify Redis is running
2. Check REDIS_* variables in .env
3. Test connection: `redis-cli -h host -p port -a password ping`

### Bot crashes

1. Check logs for errors
2. Verify all environment variables set
3. Ensure sufficient memory (min 512MB)
4. Check Node.js version (18+)

## License

Private project - All rights reserved

## Support

For issues, check logs first:
```bash
tail -100 data/logs/pm2-error.log
```
