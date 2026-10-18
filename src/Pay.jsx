import { useEffect, useState } from 'react'
import { ArrowLeft, Check, X, Delete, Download, Share2 } from 'lucide-react'
import { contacts, inr } from './data'
import { scoreTxn, recordTxn } from './risk'
import { sendOtp, sha256, wait } from './services'
import { makeReceipt } from './receipt'

const field = 'w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-base outline-none focus:border-gold-500'
const btn = 'w-full rounded-xl bg-gold-500 py-3.5 font-semibold text-ink-900 transition-transform active:scale-[0.98] disabled:opacity-50'
const ghost = 'flex items-center justify-center gap-2 rounded-xl border border-gold-500 py-3 text-sm font-medium text-gold-400 active:bg-ink-800'
const tone = (s) => (s < 30 ? '#34d399' : s < 70 ? '#f2a71b' : '#fb7185')
const say = {
  ALLOW: ['Looks safe', 'text-emerald-300'],
  REVIEW: ['Extra check needed', 'text-gold-400'],
  BLOCK: ['Blocked for your safety', 'text-rose-300']
}
const titles = { form: 'Send money', check: 'Risk check', challenge: "Verify it's you", pin: 'Enter UPI PIN' }

function Ring({ value }) {
  const C = 2 * Math.PI * 70
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r="70" fill="none" stroke="#1b2c4d" strokeWidth="10" />
        <circle cx="80" cy="80" r="70" fill="none" stroke={tone(value)} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-mono text-4xl font-semibold">{value}</p>
          <p className="text-xs text-mist">out of 100</p>
        </div>
      </div>
    </div>
  )
}

function Challenge({ onOk }) {
  const [code, setCode] = useState('')
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { sendOtp().then(setCode) }, [])
  return (
    <div className="mt-6 space-y-4">
      <p className="rounded-xl border border-gold-500/40 bg-ink-800 px-4 py-3 text-sm text-mist">
        This payment looks a little unusual, so we need one more check.{' '}
        {code ? <>Demo mode: your code is <span className="font-mono font-semibold text-gold-400">{code}</span></> : 'Sending a code…'}
      </p>
      <input className={field + ' text-center font-mono text-xl tracking-[0.4em] text-cream'} inputMode="numeric" maxLength={6} value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
      {err && <p className="text-sm text-rose-300">{err}</p>}
      <button className={btn} disabled={val.length < 6 || !code} onClick={() => (val === code ? onOk() : setErr('That code is not right.'))}>Confirm</button>
    </div>
  )
}

function PinStep({ amount, payee, onOk }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  async function press(d) {
    if (busy || pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setErr('')
    if (next.length === 4) {
      setBusy(true)
      await wait(1000)
      if (next === '1234') onOk()
      else {
        setErr('Wrong PIN. Try again.')
        setPin('')
        setBusy(false)
      }
    }
  }

  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-mist">Paying {payee}</p>
      <p className="mt-1 font-mono text-3xl font-semibold">{inr(amount)}</p>
      <div className="mt-6 flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={'h-4 w-4 rounded-full border border-gold-500 ' + (pin.length > i ? 'bg-gold-500' : '')} />
        ))}
      </div>
      <p className="mt-4 h-5 text-sm text-mist">{busy ? 'Encrypting with AES-256…' : err ? <span className="text-rose-300">{err}</span> : 'Demo PIN: 1234'}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button key={i} onClick={() => (k === 'del' ? setPin(pin.slice(0, -1)) : press(k))} className="rounded-2xl bg-ink-800 py-4 font-mono text-xl active:bg-ink-700">
              {k === 'del' ? <Delete size={22} className="mx-auto" /> : k}
            </button>
          )
        )}
      </div>
    </div>
  )
}

export default function Pay({ balance, prevHash, initial, onClose, onFinish }) {
  const [step, setStep] = useState('form')
  const [to, setTo] = useState(initial?.to || '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [demo, setDemo] = useState({ newDevice: false, geoJump: false, night: false })
  const [res, setRes] = useState(null)
  const [shown, setShown] = useState(0)
  const [ready, setReady] = useState(false)
  const [outcome, setOutcome] = useState(null)
  const [note, setNote] = useState('')

  const amt = Number(amount) || 0
  const contact = contacts.find((c) => c.upi === to.trim())
  const payeeName = contact ? contact.name : to.trim()
  const canPay = to.trim().length > 3 && amt > 0 && amt <= balance

  function submit() {
    const hour = demo.night ? 2 : new Date().getHours()
    const r = scoreTxn({ amount: amt, newPayee: !contact, hour, newDevice: demo.newDevice, geoJump: demo.geoJump })
    recordTxn()
    setRes(r)
    setShown(0)
    setReady(false)
    setStep('check')
  }

  // counts the ring up from 0 to the score
  useEffect(() => {
    if (step !== 'check' || !res) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1600)
      setShown(Math.round(res.score * p))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setReady(true)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step, res])

  // the hash is chained to the previous payment's hash (blockchain audit)
  async function complete(kind) {
    const id = 'TXN' + Date.now().toString().slice(-8)
    const hash = await sha256([prevHash, id, payeeName, amt, res.score, kind].join('|'))
    setOutcome({ kind, id, hash })
    setStep('done')
  }

  function next() {
    if (res.verdict === 'ALLOW') setStep('pin')
    else if (res.verdict === 'REVIEW') setStep('challenge')
    else complete('blocked')
  }

  function finish() {
    onFinish(
      {
        id: Date.now(),
        txnId: outcome.id,
        name: payeeName,
        amount: -amt,
        time: 'Just now',
        risk: res.score,
        rules: res.rules.map((r) => r.id),
        hash: outcome.hash,
        prev: prevHash
      },
      outcome.kind === 'paid'
    )
  }

  async function saveReceipt() {
    const blob = await makeReceipt({ amount: amt, payee: payeeName, id: outcome.id })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'titanium-receipt-' + outcome.id + '.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNote('Receipt saved to your device.')
  }

  async function shareReceipt() {
    const blob = await makeReceipt({ amount: amt, payee: payeeName, id: outcome.id })
    const file = new File([blob], 'titanium-receipt.png', { type: 'image/png' })
    const text = 'Paid ' + inr(amt) + ' to ' + payeeName + ' using TITANIUM. Transaction ID: ' + outcome.id
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text })
      else window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
    } catch {
      /* the person closed the share sheet */
    }
  }

  const paid = outcome?.kind === 'paid'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-900">
      <div className="safe-top mx-auto max-w-md px-5 pb-10">
        {step !== 'done' && (
          <header className="flex items-center gap-3">
            <button onClick={onClose} aria-label="Cancel" className="rounded-full p-2 active:bg-ink-800"><ArrowLeft size={22} /></button>
            <h1 className="font-display text-2xl">{titles[step]}</h1>
          </header>
        )}

        {step === 'form' && (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm text-mist">Saved contacts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {contacts.map((c) => (
                  <button key={c.upi} onClick={() => setTo(c.upi)} className={'rounded-full border px-3 py-1.5 text-sm ' + (to === c.upi ? 'border-gold-500 text-gold-400' : 'border-ink-600 text-cream')}>{c.name}</button>
                ))}
              </div>
            </div>
            <label className="block text-sm text-mist">Pay to (UPI ID)
              <input className={field + ' mt-1.5 text-cream'} value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@bank" />
            </label>
            <label className="block text-sm text-mist">Amount
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mist">₹</span>
                <input className={field + ' pl-9 font-mono text-xl text-cream'} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" />
              </div>
            </label>
            {amt > balance && <p className="text-sm text-rose-300">Not enough balance.</p>}
            {to.trim() && !contact && <p className="text-xs text-mist">New payee: not in your saved contacts.</p>}
            <details className="rounded-xl border border-ink-700 bg-ink-800/60 px-4 py-3 text-sm">
              <summary className="cursor-pointer text-gold-400">Demo controls</summary>
              <div className="mt-3 space-y-3 text-mist">
                {[['newDevice', 'Pretend this is a new device'], ['geoJump', 'Pretend I just moved to another city'], ['night', 'Pretend it is 2 AM']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-3">
                    <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={demo[k]} onChange={(e) => setDemo({ ...demo, [k]: e.target.checked })} />
                    {l}
                  </label>
                ))}
              </div>
            </details>
            <button className={btn} disabled={!canPay} onClick={submit}>{amt ? 'Pay ' + inr(amt) : 'Pay'}</button>
          </div>
        )}

        {step === 'check' && res && (
          <div className="mt-6">
            <p className="text-center text-sm text-mist">{ready ? 'Risk check complete' : 'Checking this payment for risk…'}</p>
            <div className="mt-4"><Ring value={shown} /></div>
            {ready && (
              <div className="mt-5 space-y-4">
                <p className={'text-center font-display text-2xl ' + say[res.verdict][1]}>{say[res.verdict][0]}</p>
                <div className="grid grid-cols-2 gap-3 text-center text-xs text-mist">
                  <div className="rounded-xl bg-ink-800 py-3">Random Forest<p className="mt-1 font-mono text-base text-cream">{Math.round(res.pRf * 100)}%</p></div>
                  <div className="rounded-xl bg-ink-800 py-3">Fuzzy Logic<p className="mt-1 font-mono text-base text-cream">{Math.round(res.rF * 100)}%</p></div>
                </div>
                <ul className="space-y-2">
                  {res.rules.length === 0 && <li className="text-center text-sm text-mist">No warning signs found.</li>}
                  {res.rules.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/70 px-4 py-3 text-sm">
                      <span className="rounded-md bg-gold-500/15 px-2 py-0.5 font-mono text-xs text-gold-400">{r.id}</span>
                      <span className="flex-1">{r.name}</span>
                      <span className="font-mono text-xs text-rose-300">+{r.pts}</span>
                    </li>
                  ))}
                </ul>
                <button className={btn} onClick={next}>
                  {res.verdict === 'ALLOW' ? 'Continue to PIN' : res.verdict === 'REVIEW' ? "Verify it's you" : 'See details'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'challenge' && <Challenge onOk={() => setStep('pin')} />}
        {step === 'pin' && <PinStep amount={amt} payee={payeeName} onOk={() => complete('paid')} />}

        {step === 'done' && outcome && (
          <div className="mt-12 text-center">
            <div className={'mx-auto grid h-20 w-20 place-items-center rounded-full ' + (paid ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300')}>
              {paid ? <Check size={40} /> : <X size={40} />}
            </div>
            <h2 className="mt-5 font-display text-3xl">{paid ? 'Payment successful' : 'Payment blocked'}</h2>
            <p className="mt-2 font-mono text-2xl">{inr(amt)}</p>
            <p className="text-sm text-mist">to {payeeName}</p>
            {!paid && <p className="mt-3 text-sm text-rose-300">No money was moved.</p>}
            <dl className="mt-6 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-800/70 text-left text-sm">
              {[
                ['Transaction ID', outcome.id],
                ['Risk score', res.score + ' / 100'],
                ...(res.rules.length ? [['Rules fired', res.rules.map((r) => r.id).join(', ')]] : []),
                ['Encryption', 'AES-256-GCM, fresh key'],
                ['Audit record', 'Saved securely']
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-mist">{k}</dt>
                  <dd className="break-all text-right font-mono text-xs">{v}</dd>
                </div>
              ))}
            </dl>
            {paid && (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button onClick={saveReceipt} className={ghost}><Download size={18} /> Save receipt</button>
                  <button onClick={shareReceipt} className={ghost}><Share2 size={18} /> Share</button>
                </div>
                {note && <p className="mt-3 text-sm text-emerald-300">{note}</p>}
              </>
            )}
            <button className={btn + ' mt-4'} onClick={finish}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}