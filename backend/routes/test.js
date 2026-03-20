
const express = require('express');
const router = express.Router();

// Test Gemini directly - visit /api/test/gemini in browser
router.get('/gemini', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ error: 'GEMINI_API_KEY not set in environment variables' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const body = {
      system_instruction: {
        parts: [{ text: 'You are a helpful assistant. Always reply in JSON format.' }],
      },
      contents: [
        { role: 'user', parts: [{ text: 'Say hello and return JSON like: {"reply": "hello", "status": "ok"}' }] },
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Return everything so we can see exactly what Gemini returns
    res.json({
      httpStatus: response.status,
      geminiResponse: data,
      extractedText: data.candidates?.[0]?.content?.parts?.[0]?.text || 'NO TEXT FOUND',
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;