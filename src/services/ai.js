// core/ai.js — PAPPY V3 GOD MODE AI
const axios = require('axios');
const logger = require('./logger');
const { ai } = require('../../config');
const { getMemory, updateMemory } = require('./ai.memory');
const { tools } = require('./ai.tools');
const { AGENTS, detectIntent } = require('./ai.agents');

// ── Best free models ordered by quality ──────────────────────────────────────
// Each has a 8s timeout — if slow, instantly swap to next
const FREE_MODELS = [
    { id: 'meta-llama/llama-3.3-70b-instruct:free',     timeout: 10000 },
    { id: 'meta-llama/llama-3.1-8b-instruct:free',      timeout: 8000  },
    { id: 'google/gemma-2-9b-it:free',                  timeout: 8000  },
    { id: 'mistralai/mistral-7b-instruct:free',         timeout: 8000  },
    { id: 'qwen/qwen-2.5-7b-instruct:free',             timeout: 8000  },
    { id: 'microsoft/phi-3-mini-128k-instruct:free',    timeout: 8000  },
    { id: 'openchat/openchat-7b:free',                  timeout: 6000  },
    { id: 'huggingfaceh4/zephyr-7b-beta:free',          timeout: 6000  },
];

// ── System prompt — professional, concise, WhatsApp-aware ────────────────────
function buildSystemPrompt(memory, prompt) {
    const ctx = memory.length
        ? '\n\nConversation history:\n' + memory.map(m => `User: ${m.user}\nAssistant: ${m.ai}`).join('\n')
        : '';

    const agentKeys = detectIntent(prompt);
    const agentContext = agentKeys.map(k => AGENTS[k]).join(' ');

    return `You are Pappy AI, a smart and professional assistant built into a WhatsApp bot called Pappy V3.

Active persona: ${agentContext}

Your personality:
- Direct, confident, and helpful
- Concise — WhatsApp messages should be short and readable
- Use *bold* for emphasis, not markdown headers
- Never use HTML tags
- If asked about code, wrap it in \`\`\`code blocks\`\`\`
- If asked who you are: "I'm Pappy AI, your built-in assistant 🤖"
- Never reveal you're powered by any specific model${ctx}`;
}

// ── Tool matcher ──────────────────────────────────────────────────────────────
async function tryToolUse(prompt) {
    for (const tool of tools) {
        if (prompt.toLowerCase().includes(tool.name.toLowerCase())) {
            try { return await tool.execute(); } catch {}
        }
    }
    return null;
}

// ── Main generate function ────────────────────────────────────────────────────
async function generateText(prompt, userId = 'global') {
    const apiKey = ai.openRouterKey;
    if (!apiKey) throw new Error('Missing OpenRouter API key');

    // Tool check first
    const toolResult = await tryToolUse(prompt);
    if (toolResult) {
        return `🛠 *Tool Result:*\n\`\`\`json\n${JSON.stringify(toolResult, null, 2)}\n\`\`\``;
    }

    const memory = await getMemory(userId);
    const systemPrompt = buildSystemPrompt(memory, prompt);

    let lastError = '';

    for (const model of FREE_MODELS) {
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: model.id,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user',   content: prompt }
                    ],
                    temperature: 0.75,
                    max_tokens: 1024,
                    top_p: 0.9,
                },
                {
                    headers: {
                        Authorization:  `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://github.com/pappy-v3',
                        'X-Title':      'Pappy V3 Bot'
                    },
                    timeout: model.timeout
                }
            );

            const reply = response.data?.choices?.[0]?.message?.content;
            if (!reply || reply.trim() === '') throw new Error('Empty response');

            // Save to memory
            await updateMemory(userId, prompt, reply);

            return `🤖 *Pappy AI*\n\n${reply.trim()}`;

        } catch (err) {
            const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
            lastError = isTimeout ? 'Timeout' : (err.response?.data?.error?.message || err.message);
            logger.warn(`[AI] ${model.id} failed (${lastError}) — trying next...`);
        }
    }

    throw new Error('All AI models are currently busy. Please try again in a moment.');
}

module.exports = { generateText };
