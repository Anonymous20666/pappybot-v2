# Changelog

## v2.1.0 - Production Refactor (2026-04-08)

### 🎉 Major Refactoring
- Complete rewrite for production stability
- Clean architecture with separated concerns
- Modular design for easy maintenance

### ✅ Stability Improvements
- All network calls wrapped in try/catch
- Automatic reconnection for WhatsApp/Telegram
- Exponential backoff retry logic
- Graceful error recovery
- No crashes on EPIPE/ECONNRESET
- 440 rate limit handling (5-30min backoff)

### 📝 Logging
- Structured logging with Pino
- Log levels: fatal, error, warn, info, debug
- Pretty printing in development
- JSON format in production

### 🗄️ Database
- MongoDB with auto-reconnection
- Proper Mongoose models
- Redis connection recovery
- Session persistence

### 🚀 Deployment
- Docker support with docker-compose
- PM2 configuration
- Environment validation
- Graceful shutdown handling

### 🤖 AI Integration
- OpenRouter API with retry logic
- Timeout handling (30s)
- Error fallback messages

### 📦 Queue System
- BullMQ with retry logic
- Worker concurrency control
- Job progress tracking
- Failed job handling

### 🛠️ Developer Experience
- Clean code structure
- Inline documentation
- Migration guide
- Deployment guide
- Comprehensive README

### 🔧 Configuration
- Environment variable validation
- Config validation on startup
- Sensible defaults

### 📚 Documentation
- README.md - Setup guide
- DEPLOYMENT.md - Production deployment
- MIGRATION.md - Migration from v2.0
- SUMMARY.txt - Complete overview

## v2.0.0 - Initial Version
- WhatsApp integration via Baileys
- Telegram control panel
- BullMQ job queue
- MongoDB persistence
- OpenRouter AI integration
