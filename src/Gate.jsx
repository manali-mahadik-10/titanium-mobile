import { useEffect, useState } from 'react'
import { Fingerprint } from 'lucide-react'
import Mark from './Mark'
import { button } from './authUi'
import { enrollFingerprint, verifyFingerprint, hasCredential, fingerprintAvailable } from './auth'

export default function Gate({ onDone }) {
  const [enrolled, setEnrolled] = useState(hasCredential)
  const [avail, setAvail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fingerprintAvailable().then(setAvail)
  }, [])

  async function enroll() {
    try {
      await enrollFingerprint() // the phone asks for your fingerprint here
      setEnrolled(true)
      onDone()
    } catch {
      setErr('Setup was cancelled or failed. Try again.')
    }
  }

  async function go() {
    setBusy(true)
    setErr('')
    if (!enrolled) await enroll()
    else {
      try {
        if (await verifyFingerprint()) onDone()
        else setErr('Fingerprint was not verified. Try again.')
      } catch {
        setErr('Cancelled or not recognised. Try again.')
      }
    }
    setBusy(false)
  }

  return (
    <div className="safe-top mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
      <div>
        <div className="mx-auto w-fit"><Mark size={72} /></div>
        <h1 className="mt-6 font-display text-2xl font-bold">{enrolled ? 'TITANIUM is locked' : 'Set up fingerprint lock'}</h1>
        <p className="mt-2 text-sm text-mist">
          {enrolled ? 'Use your fingerprint to open the app.' : 'Your phone will ask for your fingerprint once. After that, the app opens only with it.'}
        </p>
        <div className="mx-auto mt-8 grid h-24 w-24 place-items-center rounded-full border border-gold-500/40 bg-ink-800 text-gold-400">
          <Fingerprint size={52} strokeWidth={1.5} />
        </div>
        {avail === false ? (
          <p className="mt-8 text-sm text-rose-300">This phone has no fingerprint or screen lock ready. Set one up in your phone Settings, then reopen the app.</p>
        ) : (
          <button className={button + ' mt-8'} disabled={busy || avail === null} onClick={go}>{busy ? 'Waiting for fingerprint…' : enrolled ? 'Unlock with fingerprint' : 'Set up fingerprint'}</button>
        )}
        {err && <p className="mt-4 text-sm text-rose-300">{err}</p>}
        {err && enrolled && <button onClick={enroll} className="mt-4 text-xs text-mist underline">Fingerprint not working? Set it up again</button>}
      </div>
    </div>
  )
}
