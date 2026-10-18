import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Mark from './Mark'
import { input, button, Steps, FaceCapture } from './authUi'
import { newSecret, otpUri, findTotpStep, registerAccount } from './auth'

const steps = ['Account', 'OTP app', 'Face']
const titles = [
  ['Create your account', 'Choose a user ID and a strong password.'],
  ['Set up your OTP app', 'Scan this with Google Authenticator (or any authenticator app).'],
  ['Save your face', 'Look at the camera and hold still. Your face print stays on this device.']
]

function AccountStep({ onNext }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')

  function submit() {
    const u = username.trim().toLowerCase()
    if (!name.trim()) return setErr('Enter your name.')
    if (!/^[a-z0-9._]{3,20}$/.test(u)) return setErr('User ID: 3 to 20 letters, numbers, dot or underscore.')
    if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return setErr('Password: at least 8 characters, with a letter and a number.')
    if (pw !== pw2) return setErr('The two passwords do not match.')
    onNext({ name: name.trim(), username: u, password: pw })
  }

  return (
    <div className="mt-6 space-y-4">
      <label className="block text-sm text-mist">Full name
        <input className={input + ' mt-1.5 text-cream'} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-sm text-mist">User ID
        <input className={input + ' mt-1.5 text-cream'} value={username} autoCapitalize="none" onChange={(e) => setUsername(e.target.value)} placeholder="for example manali" />
      </label>
      <label className="block text-sm text-mist">Password
        <input className={input + ' mt-1.5 text-cream'} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <label className="block text-sm text-mist">Confirm password
        <input className={input + ' mt-1.5 text-cream'} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </label>
      {err && <p className="text-sm text-rose-300">{err}</p>}
      <button className={button} onClick={submit}>Continue</button>
    </div>
  )
}

function OtpSetupStep({ username, secret, onNext }) {
  const [qr, setQr] = useState('')
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    QRCode.toDataURL(otpUri(username, secret), { margin: 2, width: 240 }).then(setQr)
  }, [username, secret])

  async function verify() {
    if ((await findTotpStep(secret, val)) !== null) return onNext()
    setErr('That code is not right. Wait for the next code and try again.')
    setVal('')
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="mx-auto grid h-60 w-60 place-items-center rounded-2xl bg-white">
        {qr ? <img src={qr} alt="Authenticator QR code" className="h-60 w-60 rounded-2xl" /> : <span className="text-sm text-ink-900">Making QR…</span>}
      </div>
      <p className="text-center text-xs text-mist">Cannot scan? Enter this key by hand:<br /><span className="break-all font-mono text-sm text-cream">{secret}</span></p>
      <input className={input + ' text-center text-xl tracking-[0.4em] text-cream'} inputMode="numeric" maxLength={6} value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
      {err && <p className="text-sm text-rose-300">{err}</p>}
      <button className={button} disabled={val.length < 6} onClick={verify}>Confirm code</button>
    </div>
  )
}

export default function Register({ onDone }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(null)
  const [secret] = useState(newSecret)

  async function save(face) {
    try {
      await registerAccount({ ...data, secret, face })
    } catch {
      return 'Could not save the account on this device. Check that browser storage is allowed.'
    }
    onDone()
    return null
  }

  return (
    <div className="safe-top mx-auto min-h-full max-w-md px-5 pb-10">
      <div className="mt-2 flex items-center gap-3">
        <Mark size={40} />
        <p className="font-display text-lg font-semibold">TITANIUM</p>
      </div>
      <Steps steps={steps} current={step} />
      <h1 className="mt-8 font-display text-2xl font-bold">{titles[step][0]}</h1>
      <p className="mt-1 text-sm text-mist">{titles[step][1]}</p>
      {step === 0 && <AccountStep onNext={(d) => { setData(d); setStep(1) }} />}
      {step === 1 && <OtpSetupStep username={data.username} secret={secret} onNext={() => setStep(2)} />}
      {step === 2 && <FaceCapture label="Save my face" onDescriptor={save} />}
    </div>
  )
}
