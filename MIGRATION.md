# Migration from Old PappyBot

## Steps to Migrate

### 1. Backup Old Data
```bash
cd /tmp/pappybot-v2
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

### 2. Copy Session
```bash
cp -r /tmp/pappybot-v2/data/session/* /tmp/pappybot-v2-refactored/data/session/
```

### 3. Stop Old Bot
```bash
pkill -9 -f "pappybot.*index.js"
pm2 delete all
```

### 4. Install New Bot
```bash
cd /tmp/pappybot-v2-refactored
npm install
```

### 5. Configure
```bash
# Copy .env from old bot
cp /tmp/pappybot-v2/.env .env

# Verify configuration
node -e "require('dotenv').config(); console.log('Config OK')"
```

### 6. Start New Bot
```bash
npm start
# Or with PM2
npm run pm2
```

## Key Differences

### Architecture
- **Old**: Monolithic, mixed concerns
- **New**: Modular, separated handlers/services/storage

### Error Handling
- **Old**: Crashes on errors
- **New**: Graceful error recovery, auto-reconnect

### Logging
- **Old**: Console.log everywhere
- **New**: Structured logging with pino

### Database
- **Old**: Mixed JSON + MongoDB
- **New**: Pure MongoDB with proper models

### Queue
- **Old**: Basic BullMQ setup
- **New**: Robust queue with retry logic

## Rollback Plan

If issues occur:

```bash
# Stop new bot
pm2 stop pappybot-v2

# Restore old bot
cd /tmp/pappybot-v2
node index.js
```

## Verification

After migration, test:

1. WhatsApp connection
2. Telegram commands
3. AI responses
4. Database queries
5. Queue processing

```bash
# Check logs
pm2 logs pappybot-v2

# Check status
curl http://localhost:3000/health  # if health endpoint added
```
