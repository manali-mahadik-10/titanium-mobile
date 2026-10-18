import { useState } from 'react'
import { wait } from './services'

const attacks = {
  brute: {
    label: 'Brute-force login',
    score: null,
    lines: [
      'Sending 200 wrong passwords…',
      'Attempts 1 to 5: wrong password',
      'Rate limiter triggered after the 5th attempt',
      'Requests 6 to 200: HTTP 429 Too Many Requests',
      'bcrypt slows every guess to about 200 ms'
    ],
    result: 'No account access.'
  },
  geo: {
    label: 'Impossible travel',
    score: 74,
    lines: [
      'Payment 1 from Mumbai',
      'Payment 2 from Delhi, 15 minutes later',
      'R003 fired: location jump (+18)',
      'R004 fired: new device (+12)',
      'Composite risk score: 74 / 100'
    ],
    result: 'Stopped before any money moved.'
  },
  burst: {
    label: 'Payment burst',
    score: 88,
    lines: [
      '5 payments of ₹15,000 in 45 seconds',
      'Your 30-day average is ₹3,000 (5x higher)',
      'R001 fired: velocity burst (+20)',
      'R005 fired: 3x your average (+15)',
      'Random Forest fraud probability: 0.83',
      'Composite risk score: 88 / 100'
    ],
    result: 'Stopped before any money moved.'
  }
}

const nodes = [[50, 45], [150, 30], [250, 55], [40, 150], [110, 115], [190, 100], [230, 170], [130, 185], [270, 125]]
const edges = [[0, 4], [1, 5], [2, 5], [3, 7], [8, 6], [4, 5], [5, 6], [6, 7], [7, 4], [4, 6], [1, 2], [0, 3]]
const ring = [4, 5, 6, 7]

export default function Demo({ setSessionEnd }) {
  const [run, setRun] = useState(null)
  const [busy, setBusy] = useState(false)
  const [scan, setScan] = useState('idle')

  async function start(key) {
    if (busy) return
    setBusy(true)
    setRun({ key, shown: [], done: false })
    const a = attacks[key]
    for (let i = 0; i < a.lines.length; i++) {
      await wait(650)
      setRun((r) => ({ ...r, shown: a.lines.slice(0, i + 1) }))
    }
    await wait(500)
    setRun((r) => ({ ...r, done: true }))
    setBusy(false)
  }

  async function gnn() {
    setScan('scanning')
    await wait(1600)
    setScan('found')
  }

  const found = scan === 'found'

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-4">
        <h3 className="font-display text-lg">Attack simulator</h3>
        <p className="mt-1 text-sm text-mist">Run the three attacks from the paper and watch them get stopped.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(attacks).map(([k, a]) => (
            <button key={k} disabled={busy} onClick={() => start(k)} className="rounded-full border border-rose-400 px-3 py-1.5 text-sm text-rose-300 disabled:opacity-50">{a.label}</button>
          ))}
        </div>
        {run && (
          <div className="mt-3 rounded-xl border border-ink-700 bg-ink-900 p-3">
            <ul className="space-y-1.5 font-mono text-xs">
              {run.shown.map((l, i) => (
                <li key={i} className="text-cream"><span className="text-gold-500">&gt; </span>{l}</li>
              ))}
            </ul>
            {run.done && (
              <div className="mt-3 flex items-center gap-3 border-t border-ink-700 pt-3">
                <span className="rounded-full bg-rose-400/15 px-3 py-1 text-xs font-semibold text-rose-300">BLOCKED</span>
                <span className="text-sm text-mist">{attacks[run.key].result}</span>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-4">
        <h3 className="font-display text-lg">Fraud ring finder</h3>
        <p className="mt-1 text-sm text-mist">A graph network looks at links between accounts, not just single payments.</p>
        <svg viewBox="0 0 300 210" className="mt-3 w-full rounded-xl bg-ink-900/60">
          {edges.map(([a, b]) => {
            const hit = found && ring.includes(a) && ring.includes(b)
            return <line key={a + '-' + b} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={hit ? '#fb7185' : '#2a3f66'} strokeWidth={hit ? 2.5 : 1.5} />
          })}
          {nodes.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="9" fill={found && ring.includes(i) ? '#fb7185' : '#f2a71b'} className={scan === 'scanning' ? 'animate-pulse' : ''} />
          ))}
        </svg>
        <p className={'mt-2 text-sm ' + (found ? 'text-rose-300' : 'text-mist')}>
          {scan === 'idle' && 'Tap the button to scan the account network.'}
          {scan === 'scanning' && 'Scanning account links…'}
          {found && 'Fraud ring found: 4 linked accounts passing money in a loop.'}
        </p>
        <button disabled={scan === 'scanning'} onClick={gnn} className="mt-3 w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-ink-900 disabled:opacity-50">{found ? 'Scan again' : 'Run GNN scan'}</button>
      </section>

      <section className="rounded-2xl border border-ink-700 bg-ink-800/70 p-4">
        <h3 className="font-display text-lg">Session expiry</h3>
        <p className="mt-1 text-sm text-mist">Shorten the session to see the automatic sign-out. Stay on this tab and watch the timer.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={() => setSessionEnd(Date.now() + 10000)} className="rounded-xl border border-rose-400 py-3 text-sm text-rose-300">Expire in 10 s</button>
          <button onClick={() => setSessionEnd(Date.now() + 30 * 60 * 1000)} className="rounded-xl border border-gold-500 py-3 text-sm text-gold-400">Reset to 30 min</button>
        </div>
      </section>
    </div>
  )
}