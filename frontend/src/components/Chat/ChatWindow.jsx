import { useState, useEffect, useRef } from 'react'
import API from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import useSpeech from '../../hooks/useSpeech'
import MessageBubble from './MessageBubble'
import styles from './ChatWindow.module.css'

const STARTER_PROMPTS = [
  "Tell me about a recent trip you took or would like to take.",
  "What are your thoughts on artificial intelligence changing the world?",
  "Describe your ideal career and why it appeals to you.",
  "What book or film has influenced you the most, and why?",
]

export default function ChatWindow({ conversationId, conversation, loadingConv, onNewMessage, onToggleSidebar, sidebarOpen }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [currentConvId, setCurrentConvId] = useState(conversationId)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const { updateStats } = useAuth()

  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeech()

  // Load conversation messages when conversation changes
  useEffect(() => {
    if (conversation) {
      setMessages(conversation.messages || [])
      setCurrentConvId(conversation._id)
    } else {
      setMessages([])
      setCurrentConvId(null)
    }
  }, [conversation])

  // Update input when speech transcript comes in
  useEffect(() => {
    if (transcript) {
      setInput(transcript)
    }
  }, [transcript])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    resetTranscript()
    setSending(true)

    // Optimistic user message
    const optimisticMsg = {
      _id: Date.now(),
      role: 'user',
      content: text,
      originalText: text,
      optimistic: true,
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const { data } = await API.post('/chat/message', {
        message: text,
        conversationId: currentConvId,
      })

      // Replace optimistic + add real messages
      setMessages(prev => {
        const withoutOptimistic = prev.filter(m => !m.optimistic)
        return [
          ...withoutOptimistic,
          {
            _id: Date.now() + '-user',
            role: 'user',
            content: text,
            originalText: data.analysis.originalText,
            correctedText: data.analysis.correctedText,
            mistakes: data.analysis.mistakes,
            cefrAnalysis: data.analysis.cefrAnalysis,
            hasErrors: data.analysis.hasErrors,
          },
          {
            _id: Date.now() + '-ai',
            role: 'assistant',
            content: data.reply,
          },
        ]
      })

      if (!currentConvId) {
        setCurrentConvId(data.conversationId)
      }

      updateStats(data.stats)
      onNewMessage(data.conversationId, data)
    } catch (err) {
      setMessages(prev => prev.filter(m => !m.optimistic))
      setInput(text) // restore input
      console.error('Send failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMic = () => {
    if (isListening) {
      stopListening()
    } else {
      setInput('')
      startListening()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className={styles.window}>
      {/* Topbar */}
      <div className={styles.topbar}>
        {!sidebarOpen && (
          <button className={styles.menuBtn} onClick={onToggleSidebar}>☰</button>
        )}
        <div className={styles.topbarTitle}>
          {loadingConv ? 'Loading…' : (isEmpty ? 'New Conversation' : 'FluenC Chat')}
        </div>
        <div className={styles.topbarBadge}>
          <span className={styles.dot} />
          GPT-4o-mini
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {isEmpty && !loadingConv && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <span className={styles.logoMarkLg}>F</span>
            </div>
            <h2>Hello! I'm your English coach.</h2>
            <p>
              Speak or type anything in English. I'll correct your mistakes,
              highlight what you're doing well, and show your CEFR level.
            </p>
            <div className={styles.starters}>
              {STARTER_PROMPTS.map((p, i) => (
                <button key={i} className={styles.starter} onClick={() => setInput(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingConv && (
          <div className={styles.loadingConv}>
            <div className="loading-dots"><span/><span/><span/></div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={msg._id || i} message={msg} />
        ))}

        {sending && (
          <div className={styles.thinkingBubble}>
            <div className={styles.thinkingAvatar}>F</div>
            <div className={styles.thinkingDots}>
              <div className="loading-dots"><span/><span/><span/></div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <div className={styles.inputBox}>
          {isListening && (
            <div className={styles.listeningIndicator}>
              <span className={styles.micPulse} />
              Listening…
            </div>
          )}
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Speak now…' : 'Type or speak in English… (Enter to send)'}
            rows={1}
            disabled={sending}
          />
          <div className={styles.inputActions}>
            {isSupported && (
              <button
                className={`${styles.micBtn} ${isListening ? styles.micActive : ''}`}
                onClick={handleMic}
                title={isListening ? 'Stop listening' : 'Start voice input'}
                disabled={sending}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
            )}
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!input.trim() || sending}
            >
              {sending ? '…' : '↑'}
            </button>
          </div>
        </div>
        <p className={styles.hint}>
          Shift+Enter for new line · 🎤 voice input (Chrome/Edge) · Mistakes shown after each message
        </p>
      </div>
    </div>
  )
}