const User = require('../models/User');

const SYSTEM_PROMPT = `You are FluenC, an AI English language coach. Analyze the user's English and respond ONLY with a JSON object.

STRICT RULES:
- Output ONLY raw JSON. No markdown. No code blocks. No extra text before or after.
- The JSON must be valid and parseable.

JSON format to return:
{
  "reply": "your conversational response here (be natural, engaging, ask follow-up questions)",
  "hasErrors": false,
  "correctedText": "corrected version of user input (copy original if no errors)",
  "mistakes": [],
  "cefrAnalysis": {
    "overallLevel": "B1",
    "score": 55,
    "c1Elements": [],
    "c2Elements": [],
    "feedback": "encouraging feedback here"
  }
}

For mistakes array, each item is:
{"original": "wrong phrase", "corrected": "right phrase", "explanation": "why it is wrong", "type": "grammar"}

CEFR scoring guide:
- A1/A2 (score 10-30): very simple words, basic sentences like "I go school"
- B1 (score 31-50): simple but correct sentences, common vocabulary
- B2 (score 51-70): good vocabulary, compound sentences, some idioms
- C1 (score 71-85): advanced vocabulary like "consequently" "albeit", complex structures, subordinate clauses
- C2 (score 86-100): mastery level, sophisticated idioms, nominalizations, inversion

Example of a correct response:
{"reply":"That sounds wonderful! What is your favorite part of studying computer science?","hasErrors":false,"correctedText":"I am a computer science student.","mistakes":[],"cefrAnalysis":{"overallLevel":"B1","score":48,"c1Elements":[],"c2Elements":[],"feedback":"Good clear sentence! Try using words like 'currently' or 'pursuing' to reach B2 level."}}`;

const fallbackResponse = (message) => ({
  reply: "That's great! Tell me more about yourself or any topic you'd like to discuss in English.",
  hasErrors: false,
  correctedText: message,
  mistakes: [],
  cefrAnalysis: {
    overallLevel: 'B1',
    score: 50,
    c1Elements: [],
    c2Elements: [],
    feedback: 'Keep practicing — every message helps!',
  },
});

const callGemini = async (messages) => {
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemMsg }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Gemini error:', JSON.stringify(data));
    throw new Error(`Gemini API error: ${data?.error?.message || 'unknown'}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('Gemini raw:', text.slice(0, 400));

  if (!text) throw new Error('Gemini returned empty text');
  return text;
};

const callOpenAI = async (messages) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0].message.content;
};

const callAI = async (messages) => {
  if (process.env.OPENAI_API_KEY) {
    console.log('Using OpenAI...');
    return callOpenAI(messages);
  } else if (process.env.GEMINI_API_KEY) {
    console.log('Using Gemini...');
    return callGemini(messages);
  } else {
    throw new Error('No AI API key set. Add OPENAI_API_KEY or GEMINI_API_KEY to env vars.');
  }
};

const parseAIResponse = (rawContent, message) => {
  try {
    // Strip any accidental markdown wrapping
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate required fields exist
    if (!parsed.reply || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
      parsed.reply = "Interesting! Could you tell me more about that?";
    }
    if (!parsed.correctedText || !parsed.correctedText.trim()) {
      parsed.correctedText = message;
    }
    if (!Array.isArray(parsed.mistakes)) parsed.mistakes = [];
    if (!parsed.cefrAnalysis) {
      parsed.cefrAnalysis = { overallLevel: 'B1', score: 50, c1Elements: [], c2Elements: [], feedback: 'Good effort!' };
    }
    if (!Array.isArray(parsed.cefrAnalysis.c1Elements)) parsed.cefrAnalysis.c1Elements = [];
    if (!Array.isArray(parsed.cefrAnalysis.c2Elements)) parsed.cefrAnalysis.c2Elements = [];

    return parsed;
  } catch (e) {
    console.error('JSON parse failed. Raw was:', rawContent.slice(0, 400));
    return fallbackResponse(message);
  }
};

// @desc Send message and get AI correction + analysis
// @route POST /api/chat/message
const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const user = await User.findById(req.user._id);

    let conversation;
    let convIndex = -1;

    if (conversationId) {
      convIndex = user.conversations.findIndex(
        (c) => c._id.toString() === conversationId
      );
      if (convIndex !== -1) conversation = user.conversations[convIndex];
    }

    if (!conversation) {
      user.conversations.push({
        title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
        messages: [],
      });
      convIndex = user.conversations.length - 1;
      conversation = user.conversations[convIndex];
    }

    const recentMessages = conversation.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.role === 'user' ? m.originalText || m.content : m.content,
    }));

    let aiResponse;
    try {
      const rawContent = await callAI([
        { role: 'system', content: SYSTEM_PROMPT },
        ...recentMessages,
        { role: 'user', content: message },
      ]);
      aiResponse = parseAIResponse(rawContent, message);
    } catch (aiError) {
      console.error('AI call failed:', aiError.message);
      aiResponse = fallbackResponse(message);
    }

    const replyContent = aiResponse.reply.trim() || "Please continue — I'm here to help!";
    const correctedContent = (aiResponse.correctedText || message).trim() || message;

    const userMsg = {
      role: 'user',
      content: message,
      originalText: message,
      correctedText: correctedContent,
      mistakes: aiResponse.mistakes || [],
      cefrAnalysis: aiResponse.cefrAnalysis || null,
    };

    const assistantMsg = {
      role: 'assistant',
      content: replyContent,
    };

    user.conversations[convIndex].messages.push(userMsg);
    user.conversations[convIndex].messages.push(assistantMsg);
    user.conversations[convIndex].updatedAt = new Date();

    user.stats.totalMessages += 1;
    const level = aiResponse.cefrAnalysis?.overallLevel;
    if (level === 'C1') user.stats.c1Count += 1;
    if (level === 'C2') user.stats.c2Count += 1;

    const score = aiResponse.cefrAnalysis?.score || 0;
    user.stats.averageScore = Math.round(
      (user.stats.averageScore * (user.stats.totalMessages - 1) + score) /
        user.stats.totalMessages
    );

    await user.save();

    const savedConv = user.conversations[convIndex];

    res.json({
      conversationId: savedConv._id,
      reply: replyContent,
      analysis: {
        originalText: message,
        correctedText: correctedContent,
        hasErrors: aiResponse.hasErrors || false,
        mistakes: aiResponse.mistakes || [],
        cefrAnalysis: aiResponse.cefrAnalysis || null,
      },
      stats: user.stats,
    });
  } catch (error) {
    console.error('sendMessage error:', error.message);
    res.status(500).json({ message: 'Error processing your message', detail: error.message });
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