import { useEffect, useState } from 'react'
import { ScanFace } from 'lucide-react'
import Mark from './Mark'
import { input, button, Steps, FaceCapture } from './authUi'
import { checkPassword, verifyOtp, getAccount, lockLeft, recordFail, clearFails, eraseAll } from './auth'
import { dist, MATCH } from './face'

const steps = ['Password', 'OTP', 'Face']
const titles = [
  ['Sign in', 'Enter your user ID and password.'],
  ['Check your OTP', 'Open Google Authenticator and type the 6-digit TITANIUM code.'],
  ['Face check', 'Look at the camera and hold still.']
]

// seconds left on the 60 s lockout (the lock is saved, so a page refresh does not clear it)
function useLock() {
  const [left, setLeft] = useState(lockLeft)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft(lockLeft()), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, () => setLeft(lockLeft())]
}

const lockedText = (s) => 'Too many wrong attempts. Try again in ' + s + ' s.'

function PasswordStep({ onNext }) {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [lock, refresh] = useLock()

  async function submit() {
    if (lock > 0 || busy) return
    setBusy(true)
    setErr('')
    const ok = await checkPassword(id, pw)
    setBusy(false)
    if (ok) return onNext()
    const left = recordFail()
    refresh()
    setErr(left === 0 ? '' : 'Wrong user ID or password. ' + left + ' attempts left.')
  }

  return (
    <div className="mt-6 space-y-4">
      <label className="block text-sm text-mist">User ID
        <input className={input + ' mt-1.5 text-cream'} value={id} autoCapitalize="none" autoComplete="username" onChange={(e) => setId(e.target.value)} />
      </label>
      <label className="block text-sm text-mist">Password
        <input className={input + ' mt-1.5 text-cream'} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Enter your password" />
      </label>
      {lock > 0 ? <p className="text-sm text-rose-300">{lockedText(lock)}</p> : err && <p className="text-sm text-rose-300">{err}</p>}
      <button className={button} disabled={!id || !pw || lock > 0 || busy} onClick={submit}>{busy ? 'Checking…' : 'Continue'}</button>
    </div>
  )
}

function OtpStep({ onNext }) {
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [lock, refresh] = useLock()

  async function verify() {
    if (lock > 0 || busy) return
    setBusy(true)
    setErr('')
    const ok = await verifyOtp(val)
    setBusy(false)
    if (ok) return onNext()
    const left = recordFail()
    refresh()
    setVal('')
    setErr(left === 0 ? '' : 'That code is not right, or it was already used. Wait for the next code. ' + left + ' attempts left.')
  }

  return (
    <div className="mt-6 space-y-4">
      <input className={input + ' text-center text-xl tracking-[0.4em] text-cream'} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
      {lock > 0 ? <p className="text-sm text-rose-300">{lockedText(lock)}</p> : err && <p className="text-sm text-rose-300">{err}</p>}
      <button className={button} disabled={val.length < 6 || lock > 0 || busy} onClick={verify}>{busy ? 'Checking…' : 'Verify OTP'}</button>
    </div>
  )
}

function FaceStep({ onNext }) {
  const [lock, refresh] = useLock()
  const saved = getAccount().face

  async function check(d) {
    if (lock > 0) return lockedText(lock)
    if (dist(d, saved) < MATCH) {
      onNext()
      return null
    }
    const left = recordFail()
    refresh()
    return left === 0 ? 'Too many failed attempts. Locked for 60 seconds.' : 'Face did not match. ' + left + ' attempts left.'
  }

  return <FaceCapture label="Verify my face" onDescriptor={check} />
}

export default function Login({ onDone, notice }) {
  const [step, setStep] = useState(0)

  function next() {
    if (step < 2) return setStep(step + 1)
    clearFails()
    onDone()
  }

  function erase() {
    if (window.confirm('Erase the account on this device and register again? Your saved payments are erased too.')) {
      eraseAll()
      location.reload()
    }
  }

  return (
    <div className="safe-top mx-auto min-h-full max-w-md px-5 pb-10">
      <div className="mt-2 flex items-center gap-3">
        <Mark size={40} />
        <p className="font-display text-lg font-semibold">TITANIUM</p>
      </div>
      <Steps steps={steps} current={step} />
      {notice && <p className="mt-4 rounded-xl border border-gold-500/40 bg-ink-800 px-4 py-3 text-sm text-gold-400">{notice}</p>}
      <h1 className="mt-8 flex items-center gap-2 font-display text-2xl font-bold">
        {step === 2 && <ScanFace className="text-gold-400" />}{titles[step][0]}
      </h1>
      <p className="mt-1 text-sm text-mist">{titles[step][1]}</p>
      {step === 0 && <PasswordStep onNext={next} />}
      {step === 1 && <OtpStep onNext={next} />}
      {step === 2 && <FaceStep onNext={next} />}
      <button onClick={erase} className="mt-10 w-full text-center text-xs text-mist underline">Forgot your password? Erase this device and register again</button>
    </div>
  )
}
