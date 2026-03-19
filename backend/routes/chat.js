const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect); // All chat routes require authentication

router.post('/message', sendMessage);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

module.exports = router;