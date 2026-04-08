const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { retry } = require('../utils/retry');

class AIService {
    constructor() {
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'anthropic/claude-3.5-sonnet';
    }

    async generateText(prompt, userId = 'default') {
        try {
            return await retry(
                async () => {
                    const response = await axios.post(
                        this.apiUrl,
                        {
                            model: this.model,
                            messages: [
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            max_tokens: 1000
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${config.openRouterKey}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 30000
                        }
                    );

                    return response.data.choices[0].message.content;
                },
                {
                    maxRetries: 2,
                    delay: 1000,
                    onRetry: (error, attempt) => {
                        logger.warn(`AI request retry ${attempt}:`, error.message);
                    }
                }
            );
        } catch (error) {
            logger.error('AI generation failed:', error.message);
            throw new Error('AI service temporarily unavailable');
        }
    }
}

module.exports = new AIService();
