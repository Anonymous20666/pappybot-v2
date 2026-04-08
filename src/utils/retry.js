const logger = require('./logger');

async function retry(fn, options = {}) {
    const {
        maxRetries = 3,
        delay = 1000,
        backoff = 2,
        onRetry = null
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                break;
            }

            const waitTime = delay * Math.pow(backoff, attempt - 1);
            
            if (onRetry) {
                onRetry(error, attempt, waitTime);
            } else {
                logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms:`, error.message);
            }

            await sleep(waitTime);
        }
    }

    throw lastError;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { retry, sleep };
