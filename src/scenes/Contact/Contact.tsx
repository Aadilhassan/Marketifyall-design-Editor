import { useState } from 'react'
import EditorialShell from '@/components/EditorialShell'
import Seo from '@/components/Seo'

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '2px solid var(--ink)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontFamily: 'var(--sans)',
  fontSize: 16,
  marginTop: 8,
  boxSizing: 'border-box',
  outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
}

function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = `From: ${name} <${email}>\n\n${message}`
    window.location.href = `mailto:support@marketifyall.com?subject=${encodeURIComponent(
      subject || 'Hello',
    )}&body=${encodeURIComponent(body)}`
  }

  return (
    <EditorialShell folio="CONTACT · GET IN TOUCH">
      <Seo
        title="Contact — Marketifyall Design Editor"
        description="Get in touch with the Marketifyall team — questions, feedback, bug reports and contributions to the open-source design editor."
        path="/contact"
      />
      <main className="wrap">
        <div className="shead reveal">
          <span className="no">№ 01</span>
          <h2>Get in touch</h2>
          <span className="meta">We read everything</span>
        </div>
        <p className="standfirst reveal">
          Questions, feedback, bug reports or contributions — reach us directly, or send a note below.
        </p>

        <div
          className="reveal"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 0, border: '2px solid var(--ink)', marginTop: 18 }}
        >
          {/* contact info */}
          <div style={{ padding: 34, borderRight: '2px solid var(--ink)' }}>
            <h4 style={{ ...labelStyle, color: 'var(--accent)', marginBottom: 18 }}>Contact information</h4>
            <Info label="General & support" value="support@marketifyall.com" href="mailto:support@marketifyall.com" />
            <Info
              label="Contributing"
              value="github.com/Aadilhassan/Marketifyall-design-Editor"
              href="https://github.com/Aadilhassan/Marketifyall-design-Editor"
            />
            <Info label="Social" value="twitter.com/marketifyall" href="https://twitter.com/marketifyall" />
            <Info label="Made by" value="QuickShift Labs" href="https://quickshiftlabs.com/" last />
          </div>

          {/* form */}
          <form style={{ padding: 34 }} onSubmit={submit}>
            <h4 style={{ ...labelStyle, color: 'var(--accent)', marginBottom: 18 }}>Send us a message</h4>
            <div style={{ marginBottom: 16 }}>
              <span style={labelStyle}>Your name</span>
              <input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={labelStyle}>Email address</span>
              <input type="email" style={fieldStyle} value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={labelStyle}>Subject</span>
              <input style={fieldStyle} value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <span style={labelStyle}>Message</span>
              <textarea style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }} value={message} onChange={e => setMessage(e.target.value)} required />
            </div>
            <button type="submit" className="btn">
              Send via email <span className="ar">↗</span>
            </button>
          </form>
        </div>
      </main>
    </EditorialShell>
  )
}

const Info = ({ label, value, href, last }: { label: string; value: string; href: string; last?: boolean }) => (
  <div style={{ padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--rule)' }}>
    <div style={labelStyle}>{label}</div>
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', wordBreak: 'break-word' }}
    >
      {value}
    </a>
  </div>
)

export default Contact
