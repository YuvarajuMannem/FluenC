import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Decorative background */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />
      <div className={styles.bgGrid} />

      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>F</span>
          <span>FluenC</span>
        </div>
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.navLogin}>Sign in</Link>
          <Link to="/register" className={styles.navCta}>Start Free</Link>
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.badge}>✦ AI-Powered English Coach</div>
        <h1 className={styles.headline}>
          Speak English at<br />
          <em>C1 & C2 level.</em>
        </h1>
        <p className={styles.sub}>
          Practice real conversations, get instant grammar corrections,
          and see exactly which vocabulary and structures elevate your English
          to advanced mastery.
        </p>
        <div className={styles.heroCta}>
          <Link to="/register" className={styles.ctaPrimary}>
            Start Practicing Free
            <span>→</span>
          </Link>
          <Link to="/login" className={styles.ctaSecondary}>
            Sign in
          </Link>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewChat}>
            <div className={styles.previewMsg + ' ' + styles.user}>
              <span>I have went to the market yesterday and buyed some vegetables.</span>
            </div>
            <div className={styles.previewMsg + ' ' + styles.ai}>
              <div className={styles.previewCorrection}>
                <div className={styles.corrLabel}>✓ Corrected</div>
                <p>I <span className={styles.fix}>went</span> to the market yesterday and <span className={styles.fix}>bought</span> some vegetables.</p>
              </div>
              <div className={styles.previewLevel}>
                <span className={styles.levelBadge} style={{background:'var(--sapphire-pale)', color:'var(--sapphire)'}}>B1 level</span>
                <span className={styles.levelHint}>Use "consequently" or "in retrospect" to reach C1!</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className={styles.features}>
        {[
          { icon: '🎤', title: 'Speak or Type', desc: 'Use your microphone or keyboard. Web Speech API converts your voice to text instantly.' },
          { icon: '🔴', title: 'Mistake Detection', desc: 'Every grammar error highlighted in red. Corrected forms shown in green with explanations.' },
          { icon: '📊', title: 'CEFR Analysis', desc: 'Each message scored A1–C2. See exactly which C1/C2 vocabulary and structures you\'re using.' },
          { icon: '💾', title: 'Saved History', desc: 'All conversations stored in your account. Track your progress over time.' },
        ].map(f => (
          <div key={f.title} className={styles.featureCard}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>F</span>
          <span>FluenC</span>
        </div>
        <p>© 2024 FluenC. Built with React, Node.js & GPT-4o-mini.</p>
      </footer>
    </div>
  )
}