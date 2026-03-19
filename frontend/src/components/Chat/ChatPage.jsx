import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import ChatWindow from './ChatWindow'
import styles from './ChatPage.module.css'
import API from '../../utils/api'

export default function ChatPage() {
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [activeConv, setActiveConv] = useState(null)
  const [loadingConv, setLoadingConv] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Load conversation list on mount
  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const { data } = await API.get('/chat/conversations')
      setConversations(data)
    } catch (err) {
      console.error('Failed to load conversations', err)
    }
  }

  const loadConversation = async (id) => {
    setLoadingConv(true)
    setActiveConvId(id)
    try {
      const { data } = await API.get(`/chat/conversations/${id}`)
      setActiveConv(data)
    } catch (err) {
      console.error('Failed to load conversation', err)
    } finally {
      setLoadingConv(false)
    }
  }

  const startNewChat = () => {
    setActiveConvId(null)
    setActiveConv(null)
  }

  const handleNewMessage = (convId, updatedData) => {
    // If new conversation, add it to the list
    if (!activeConvId) {
      setActiveConvId(convId)
      fetchConversations()
    } else {
      fetchConversations()
    }
  }

  const handleDeleteConv = async (id) => {
    try {
      await API.delete(`/chat/conversations/${id}`)
      setConversations(prev => prev.filter(c => c._id !== id))
      if (activeConvId === id) startNewChat()
    } catch (err) {
      console.error('Failed to delete conversation', err)
    }
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeConvId}
        onSelect={loadConversation}
        onNew={startNewChat}
        onDelete={handleDeleteConv}
        onToggle={() => setSidebarOpen(p => !p)}
      />
      <main className={`${styles.main} ${!sidebarOpen ? styles.mainFull : ''}`}>
        <ChatWindow
          conversationId={activeConvId}
          conversation={activeConv}
          loadingConv={loadingConv}
          onNewMessage={handleNewMessage}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          sidebarOpen={sidebarOpen}
        />
      </main>
    </div>
  )
}