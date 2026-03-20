const User = require('../models/User');

// Supports OpenAI (if OPENAI_API_KEY set) or Gemini (if GEMINI_API_KEY set)
let callAI;

if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  callAI = async (messages) => {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    return completion.choices[0].message.content;
  };
} else {
  // Free Gemini fallback
  callAI = async (messages) => {
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');
    const contents = chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemMsg }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
        }),
      }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };
}

const SYSTEM_PROMPT = `You are FluenC, an expert English language coach specializing in C1/C2 (Advanced/Mastery) level CEFR assessment. Your role is to:

1. ENGAGE in natural conversation on any topic the user wants to discuss
2. CORRECT grammar, vocabulary, and structural mistakes
3. ANALYZE the CEFR level of the user's language
4. PROVIDE encouraging, constructive feedback

For EVERY user message, respond ONLY with a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "reply": "Your conversational response to continue the dialogue naturally",
  "hasErrors": true/false,
  "correctedText": "The corrected version of what the user said (same if no errors)",
  "mistakes": [
    {
      "original": "the wrong phrase",
      "corrected": "the right phrase",
      "explanation": "Why this is wrong and the correct rule",
      "type": "grammar|vocabulary|structure|punctuation"
    }
  ],
  "cefrAnalysis": {
    "overallLevel": "A1|A2|B1|B2|C1|C2",
    "score": 0-100,
    "c1Elements": ["list of C1-level vocabulary/structures found, or empty array"],
    "c2Elements": ["list of C2-level vocabulary/structures found, or empty array"],
    "feedback": "Brief encouraging feedback about their English level in this message"
  }
}

CEFR Guidelines:
- C2 elements: highly sophisticated vocabulary, complex nominalizations, advanced idiomatic expressions, nuanced conditionals, inversion for emphasis
- C1 elements: advanced vocabulary (e.g. 'consequently', 'albeit', 'whereby'), complex sentence structures, passive voice, subordinate clauses, academic register
- B2: varied vocabulary, compound sentences, some idiomatic language
- B1 and below: simple vocabulary, basic sentence structures

Be encouraging and educational. The reply should feel like a natural conversation partner, not a robot.`;

// @desc Send message and get AI correction + analysis
// @route POST /api/chat/message
const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const user = await User.findById(req.user._id);

    // Find or create conversation
    let conversation;
    let convIndex = -1;

    if (conversationId) {
      convIndex = user.conversations.findIndex(
        (c) => c._id.toString() === conversationId
      );
      if (convIndex !== -1) {
        conversation = user.conversations[convIndex];
      }
    }

    if (!conversation) {
      user.conversations.push({
        title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
        messages: [],
      });
      convIndex = user.conversations.length - 1;
      conversation = user.conversations[convIndex];
    }

    // Build conversation history for context (last 10 messages)
    const recentMessages = conversation.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.role === 'user' ? m.originalText || m.content : m.content,
    }));

    // Call AI (OpenAI or Gemini depending on env vars)
    const rawContent = await callAI([
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentMessages,
      { role: 'user', content: message },
    ]);

    let aiResponse;

    try {
      // Clean up potential markdown wrapping
      const cleaned = rawContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      aiResponse = JSON.parse(cleaned);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      aiResponse = {
        reply: rawContent,
        hasErrors: false,
        correctedText: message,
        mistakes: [],
        cefrAnalysis: {
          overallLevel: 'B2',
          score: 60,
          c1Elements: [],
          c2Elements: [],
          feedback: 'Keep practicing your English!',
        },
      };
    }

    // Save user message
    const userMsg = {
      role: 'user',
      content: message,
      originalText: message,
      correctedText: aiResponse.correctedText || message,
      mistakes: aiResponse.mistakes || [],
      cefrAnalysis: aiResponse.cefrAnalysis || null,
    };

    // Save assistant reply
    const assistantMsg = {
      role: 'assistant',
      content: aiResponse.reply,
    };

    user.conversations[convIndex].messages.push(userMsg);
    user.conversations[convIndex].messages.push(assistantMsg);
    user.conversations[convIndex].updatedAt = new Date();

    // Update user stats
    user.stats.totalMessages += 1;
    const level = aiResponse.cefrAnalysis?.overallLevel;
    if (level === 'C1') user.stats.c1Count += 1;
    if (level === 'C2') user.stats.c2Count += 1;

    // Running average score
    const score = aiResponse.cefrAnalysis?.score || 0;
    user.stats.averageScore = Math.round(
      (user.stats.averageScore * (user.stats.totalMessages - 1) + score) /
        user.stats.totalMessages
    );

    await user.save();

    const savedConv = user.conversations[convIndex];

    res.json({
      conversationId: savedConv._id,
      reply: aiResponse.reply,
      analysis: {
        originalText: message,
        correctedText: aiResponse.correctedText || message,
        hasErrors: aiResponse.hasErrors || false,
        mistakes: aiResponse.mistakes || [],
        cefrAnalysis: aiResponse.cefrAnalysis || null,
      },
      stats: user.stats,
    });
  } catch (error) {
    console.error('Chat error:', error);
    if (error.code === 'insufficient_quota') {
      return res
        .status(429)
        .json({ message: 'OpenAI quota exceeded. Please check your API key.' });
    }
    res.status(500).json({ message: 'Error processing your message' });
  }
};

// @desc Get all conversations for user
// @route GET /api/chat/conversations
const getConversations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('conversations');
    const convSummaries = user.conversations
      .map((c) => ({
        _id: c._id,
        title: c.title,
        messageCount: c.messages.length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(convSummaries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations' });
  }
};

// @desc Get a single conversation with all messages
// @route GET /api/chat/conversations/:id
const getConversation = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('conversations');
    const conversation = user.conversations.find(
      (c) => c._id.toString() === req.params.id
    );

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversation' });
  }
};

// @desc Delete a conversation
// @route DELETE /api/chat/conversations/:id
const deleteConversation = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.conversations = user.conversations.filter(
      (c) => c._id.toString() !== req.params.id
    );
    await user.save();
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting conversation' });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
};