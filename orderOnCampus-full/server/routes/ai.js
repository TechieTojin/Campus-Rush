const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

router.post('/chat', async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not configured' });
        }
        const { messages } = req.body;

        // Enhanced system message for better food recommendations
        const systemMessage = {
            role: 'system',
            content: `You are a helpful AI assistant for a campus food ordering app. Your main tasks are:
            1. What food options are available at Nadhini?
            2. What are the budget-friendly items?
            3. Help with menu and prices
            4. Provide food recommendations veg/non-veg
            Keep responses concise and focused on food ordering.`
        };

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [systemMessage, ...messages],
            temperature: 0.7,
            max_tokens: 300,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        res.json({ message: response.choices[0].message.content });
    } catch (error) {
        console.error('Error in AI chat:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

module.exports = router; 