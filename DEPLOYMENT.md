# Deployment Guide

## Quick Start

### 1. Clone and Setup
```bash
git clone <repo>
cd pappybot-v2-refactored
npm install
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start Services

#### Option A: Local
```bash
npm start
```

#### Option B: PM2 (Recommended)
```bash
npm install -g pm2
npm run pm2
pm2 save
pm2 startup
```

#### Option C: Docker
```bash
docker-compose up -d
```

## Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Configure LOG_LEVEL=info
- [ ] Set strong Redis password
- [ ] Set strong MongoDB password
- [ ] Enable firewall (ports 6379, 27017)
- [ ] Setup log rotation
- [ ] Configure backup for data/
- [ ] Test WhatsApp pairing
- [ ] Test Telegram commands
- [ ] Monitor memory usage
- [ ] Setup process monitoring

## Maintenance

### Backup
```bash
# Backup session
tar -czf session-backup.tar.gz data/session/

# Backup MongoDB
mongodump --uri="$MONGO_URI" --out=backup/
```

### Update
```bash
git pull
npm install
pm2 restart pappybot-v2
```

### Logs
```bash
# PM2 logs
pm2 logs pappybot-v2 --lines 100

# Docker logs
docker-compose logs -f --tail=100
```

### Health Check
```bash
# Check process
pm2 status

# Check memory
pm2 monit

# Check connections
netstat -an | grep -E '6379|27017'
```
