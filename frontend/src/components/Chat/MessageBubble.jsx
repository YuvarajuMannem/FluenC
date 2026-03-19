import { useState } from 'react'
import styles from './MessageBubble.module.css'

const CEFR_COLORS = {
  A1: { bg: '#f1f5f9', text: '#475569' },
  A2: { bg: '#e2e8f0', text: '#334155' },
  B1: { bg: '#dbeafe', text: '#1d4ed8' },
  B2: { bg: '#ede9fe', text: '#6d28d9' },
  C1: { bg: '#fef3c7', text: '#b45309' },
  C2: { bg: '#d1fae5', text: '#065f46' },
}

const MISTAKE_COLORS = {
  grammar: { bg: 'var(--rose-pale)', text: 'var(--rose)', label: 'Grammar' },
  vocabulary: { bg: 'var(--sapphire-pale)', text: 'var(--sapphire)', label: 'Vocabulary' },
  structure: { bg: 'var(--gold-pale)', text: '#8a6a1a', label: 'Structure' },
  punctuation: { bg: 'var(--parchment-dark)', text: 'var(--ink-muted)', label: 'Punctuation' },
}

export default function MessageBubble({ message }) {
  const [expanded, setExpanded] = useState(false)

  const isUser = message.role === 'user'
  const hasAnalysis = isUser && (message.mistakes?.length > 0 || message.cefrAnalysis)

  if (!isUser) {
    return (
      <div className={`${styles.row} ${styles.aiRow} fade-in`}>
        <div className={styles.aiAvatar}>F</div>
        <div className={styles.aiBubble}>
          <p>{message.content}</p>
        </div>
      </div>
    )
  }

  const cefr = message.cefrAnalysis
  const cefrStyle = cefr ? (CEFR_COLORS[cefr.overallLevel] || CEFR_COLORS.B1) : null
  const hasMistakes = message.mistakes?.length > 0
  const hasCorrection = hasMistakes && message.correctedText !== message.originalText

  return (
    <div className={`${styles.row} ${styles.userRow} fade-in`}>
      <div className={styles.userSide}>
        {/* Original message */}
        <div className={styles.userBubble}>
          {hasMistakes ? (
            <p className={styles.originalWithErrors}>{message.originalText}</p>
          ) : (
            <p>{message.originalText}</p>
          )}
        </div>

        {/* Analysis panel */}
        {hasAnalysis && (
          <div className={styles.analysis}>
            {/* CEFR badge row */}
            {cefr && (
              <div className={styles.cefrRow}>
                <span
                  className={styles.cefrBadge}
                  style={{ background: cefrStyle.bg, color: cefrStyle.text }}
                >
                  {cefr.overallLevel} Level
                </span>
                <div className={styles.scoreBarWrap}>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{ width: `${cefr.score}%`, background: cefrStyle.text }}
                    />
                  </div>
                  <span className={styles.scoreNum}>{cefr.score}/100</span>
                </div>
              </div>
            )}

            {/* Corrected version */}
            {hasCorrection && (
              <div className={styles.correction}>
                <div className={styles.correctionLabel}>✓ Corrected version</div>
                <p className={styles.correctedText}>{message.correctedText}</p>
              </div>
            )}

            {!hasMistakes && (
              <div className={styles.noErrors}>✓ No mistakes found!</div>
            )}

            {/* Mistakes toggle */}
            {hasMistakes && (
              <>
                <button
                  className={styles.toggleMistakes}
                  onClick={() => setExpanded(p => !p)}
                >
                  {expanded ? '▲ Hide' : '▼ Show'} {message.mistakes.length} mistake{message.mistakes.length !== 1 ? 's' : ''}
                </button>

                {expanded && (
                  <div className={styles.mistakes}>
                    {message.mistakes.map((m, i) => {
                      const mc = MISTAKE_COLORS[m.type] || MISTAKE_COLORS.grammar
                      return (
                        <div key={i} className={styles.mistakeItem}>
                          <span className={styles.mistakeType} style={{ background: mc.bg, color: mc.text }}>
                            {mc.label}
                          </span>
                          <div className={styles.mistakeContent}>
                            <span className={styles.wrong}>{m.original}</span>
                            <span className={styles.arrow}>→</span>
                            <span className={styles.right}>{m.corrected}</span>
                          </div>
                          <p className={styles.explanation}>{m.explanation}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* C1/C2 elements */}
            {cefr && (cefr.c1Elements?.length > 0 || cefr.c2Elements?.length > 0) && (
              <div className={styles.cefrElements}>
                {cefr.c2Elements?.length > 0 && (
                  <div className={styles.cefrGroup}>
                    <span className={styles.cefrGroupLabel} style={{ color: CEFR_COLORS.C2.text }}>
                      C2 elements:
                    </span>
                    {cefr.c2Elements.map((el, i) => (
                      <span key={i} className={styles.cefrTag} style={{ background: CEFR_COLORS.C2.bg, color: CEFR_COLORS.C2.text }}>
                        {el}
                      </span>
                    ))}
                  </div>
                )}
                {cefr.c1Elements?.length > 0 && (
                  <div className={styles.cefrGroup}>
                    <span className={styles.cefrGroupLabel} style={{ color: CEFR_COLORS.C1.text }}>
                      C1 elements:
                    </span>
                    {cefr.c1Elements.map((el, i) => (
                      <span key={i} className={styles.cefrTag} style={{ background: CEFR_COLORS.C1.bg, color: CEFR_COLORS.C1.text }}>
                        {el}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {cefr?.feedback && (
              <p className={styles.feedback}>{cefr.feedback}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}