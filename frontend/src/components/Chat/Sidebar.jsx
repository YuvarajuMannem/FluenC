import { useAuth } from '../../context/AuthContext'
import styles from './Sidebar.module.css'

const CEFR_COLORS = {
  A1: '#94a3b8', A2: '#64748b', B1: '#3b82f6', B2: '#8b5cf6',
  C1: '#f59e0b', C2: '#10b981'
}

export default function Sidebar({ open, conversations, activeId, onSelect, onNew, onDelete, onToggle }) {
  const { user, logout } = useAuth()

  const stats = user?.stats || {}

  return (
    <aside className={`${styles.sidebar} ${!open ? styles.closed : ''}`}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>F</span>
          {open && <span>FluenC</span>}
        </div>
        <button className={styles.toggleBtn} onClick={onToggle} title={open ? 'Collapse' : 'Expand'}>
          {open ? '←' : '→'}
        </button>
      </div>

      {open && (
        <>
          <button className={styles.newChat} onClick={onNew}>
            <span>+</span> New Conversation
          </button>

          {/* User stats */}
          <div className={styles.statsCard}>
            <div className={styles.statsTitle}>Your Progress</div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statNum}>{stats.totalMessages || 0}</span>
                <span className={styles.statLabel}>Messages</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNum} style={{color: CEFR_COLORS.C1}}>{stats.c1Count || 0}</span>
                <span className={styles.statLabel}>C1 msgs</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNum} style={{color: CEFR_COLORS.C2}}>{stats.c2Count || 0}</span>
                <span className={styles.statLabel}>C2 msgs</span>
              </div>
            </div>
            {stats.totalMessages > 0 && (
              <div className={styles.avgScore}>
                <div className={styles.scoreBar}>
                  <div className={styles.scoreFill} style={{width: `${stats.averageScore}%`}} />
                </div>
                <span>Avg score: {stats.averageScore}/100</span>
              </div>
            )}
          </div>

          <div className={styles.convList}>
            <div className={styles.convListLabel}>Conversations</div>
            {conversations.length === 0 ? (
              <div className={styles.empty}>No conversations yet.<br />Start a new one above!</div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv._id}
                  className={`${styles.convItem} ${activeId === conv._id ? styles.active : ''}`}
                  onClick={() => onSelect(conv._id)}
                >
                  <div className={styles.convTitle}>{conv.title}</div>
                  <div className={styles.convMeta}>
                    <span>{conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}</span>
                    <button
                      className={styles.deleteBtn}
                      onClick={e => { e.stopPropagation(); onDelete(conv._id) }}
                      title="Delete"
                    >×</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.userBar}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
              <div>
                <div className={styles.userName}>{user?.name}</div>
                <div className={styles.userEmail}>{user?.email}</div>
              </div>
            </div>
            <button className={styles.logoutBtn} onClick={logout} title="Sign out">⏻</button>
          </div>
        </>
      )}
    </aside>
  )
}