import { useEffect, useState } from 'react'
import { ScanFace, Brain, ShieldAlert, Globe, Lock, Link2 } from 'lucide-react'
import { sha256 } from './services'
import Demo from './Demo'

export const defaultPolicies = { afterHours: true, intl: true, velocity: true, crypto: true, newDevice: true, freeze: false }

const policyList = [
  { id: 'afterHours', name: 'After-hours limit', desc: 'Cap payments between 10 PM and 6 AM', cat: 'txn', pts: 6 },
  { id: 'intl', name: 'International hold', desc: 'Block cross-border transfers', cat: 'txn', pts: 6 },
  { id: 'velocity', name: 'Velocity cap', desc: 'Max 10 UPI payments per hour', cat: 'txn', pts: 6 },
  { id: 'crypto', name: 'Crypto restriction', desc: 'Flag exchange-bound payments', cat: 'txn', pts: 7 },
  { id: 'newDevice', name: 'New device OTP', desc: 'Ask for an OTP on unknown devices', cat: 'dev', pts: 10 },
  { id: 'freeze', name: 'Anomaly auto-freeze', desc: 'Freeze the account on a behaviour spike', cat: 'beh', pts: 10 }
]

function breakdown(p) {
  const on = (cat) => policyList.filter((x) => x.cat === cat && p[x.id]).reduce((s, x) => s + x.pts, 0)
  return [
    ['Authentication strength', 25],
    ['Transaction safety', on('txn')],
    ['Device trust', 12 + on('dev')],
    ['Behavioral profile', 15 + on('beh')]
  ]
}

const dna = [['Typing', 0.92], ['Swipes', 0.88], ['Location', 0.95], ['Hours', 0.9], ['Device', 0.85]]

function Switch({ on, onChange, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={'relative h-6 w-11 shrink-0 rounded-full transition-colors ' + (on ? 'bg-emerald-500' : 'bg-ink-600')}>
      <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-all ' + (on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

function Timer({ end }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = Math.max(0, Math.round((end - now) / 1000))
  return <span>{String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</span>
}

function Radar() {
  const pt = (i, r) => {
    const a = ((-90 + i * 72) * Math.PI) / 180
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r]
  }
  const poly = (k) => dna.map((_, i) => pt(i, 70 * k).join(',')).join(' ')
  return (
    <svg viewBox="0 0 200 200" className="mx-auto w-56">
      {[0.33, 0.66, 1].map((k) => <polygon key={k} points={poly(k)} fill="none" stroke="#2a3f66" />)}
      <polygon points={dna.map(([, v], i) => pt(i, 70 * v).join(',')).join(' ')} fill="rgba(242,167,27,0.25)" stroke="#f2a71b" strokeWidth="2" />
      {dna.map(([l], i) => {
        const [x, y] = pt(i, 88)
        return <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#8fa0bd">{l}</text>
      })}
    </svg>
  )
}

export default function Security({ policies, setPolicies, list, sessionEnd, setSessionEnd, onReset, onSignOut }) {
  const [demo, setDemo] = useState(false)
  const [fp, setFp] = useState('…')

  useEffect(() => {
    sha256(navigator.userAgent + screen.width + 'x' + screen.height).then((h) => setFp(h.slice(0, 12)))
  }, [])

  const rows = breakdown(policies)
  const score = rows.reduce((s, [, v]) => s + v, 0)
  const C = 2 * Math.PI * 50
  const flagged = list.filter((t) => t.risk >= 30).length
  const layers = [
    [ScanFace, 'Face and OTP login', '3-step sign in'],
    [Brain, 'Risk engine', 'Random Forest + Fuzzy Logic · 94.3% accurate'],
    [ShieldAlert, 'Intrusion rules', '5 CERT-In rules · ' + flagged + ' payments flagged'],
    [Globe, 'Phishing detector', '94.7% accurate'],
    [Lock, 'AES-256 encryption', 'A new key for every payment'],
    [Link2, 'Blockchain audit', list.length + ' blocks in the chain']
  ]

  return (
    <div className="safe-top px-5">
      <h1 className="font-display text-2xl">Security</h1>
      <p className="mt-1 text-sm text-mist">Your protection, live.</p>

      <section className="mt-4 flex items-center gap-4 rounded-2xl border border-gold-500/30 bg-ink-800 p-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1b2c4d" strokeWidth="9" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#f2a71b" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .6s' }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div><p className="font-mono text-3xl font-semibold">{score}</p><p className="text-[11px] text-mist">out of 100</p></div>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2.5">
          {rows.map(([name, v]) => (
            <li key={name}>
              <div className="flex justify-between text-xs"><span className="truncate text-mist">{name}</span><span className="font-mono">{v}/25</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-ink-700"><div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: (v / 25) * 100 + '%' }} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5">
        <h2 className="font-display text-lg">Protection settings</h2>
        <ul className="mt-2 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-800/70">
          {policyList.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-mist">{p.desc}</p>
              </div>
              <Switch on={policies[p.id]} label={p.name} onChange={() => setPolicies({ ...policies, [p.id]: !policies[p.id] })} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-2xl border border-ink-700 bg-ink-800/70 p-4">
        <p className="text-sm text-mist">Session expires in</p>
        <p className="font-mono text-4xl font-semibold text-gold-400"><Timer end={sessionEnd} /></p>
        <p className="mt-2 text-xs text-mist">Token rotates every 15 minutes</p>
        <p className="mt-1 text-xs text-mist">Device fingerprint <span className="font-mono text-cream">{fp}</span></p>
        <button onClick={onSignOut} className="mt-4 w-full rounded-xl border border-gold-500 py-3 text-sm text-gold-400">Sign out</button>
      </section>

      <section className="mt-5">
        <h2 className="font-display text-lg">Defense layers</h2>
        <ul className="mt-2 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-800/70">
          {layers.map(([Icon, name, note]) => (
            <li key={name} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-700 text-gold-400"><Icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-mist">{note}</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-300">Active</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 rounded-2xl border border-ink-700 bg-ink-800/70 p-4">
        <h2 className="font-display text-lg">Behavioral DNA</h2>
        <p className="text-sm text-mist">How closely you match your usual habits.</p>
        <div className="mt-2"><Radar /></div>
      </section>

      <section className="mt-5 rounded-2xl border border-gold-500/30 bg-ink-800 p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg">Demo mode</h2>
            <p className="text-xs text-mist">Tools for showing the system at work.</p>
          </div>
          <Switch on={demo} label="Demo mode" onChange={() => setDemo(!demo)} />
        </div>
        {demo && (
          <>
            <Demo setSessionEnd={setSessionEnd} />
            <button onClick={onReset} className="mt-4 w-full rounded-xl border border-rose-400 py-3 text-sm text-rose-300">Reset demo data</button>
          </>
        )}
      </section>
    </div>
  )
}