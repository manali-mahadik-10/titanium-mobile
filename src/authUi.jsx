import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { wait } from './services'
import { loadFace, readFace, faceVisible, average } from './face'

export const input = 'w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-base outline-none focus:border-gold-500'
export const button = 'w-full rounded-xl bg-gold-500 py-3.5 font-semibold text-ink-900 transition-transform active:scale-[0.98] disabled:opacity-50'

export function Steps({ steps, current }) {
  return (
    <ol className="mt-6 flex items-center">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none">
          <span className={'grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ' + (i < current ? 'bg-emerald-400 text-ink-900' : i === current ? 'bg-gold-500 text-ink-900' : 'bg-ink-700 text-mist')}>
            {i < current ? '✓' : i + 1}
          </span>
          <span className={'ml-2 text-xs ' + (i === current ? 'text-cream' : 'text-mist')}>{s}</span>
          {i < steps.length - 1 && <span className="mx-3 h-px flex-1 bg-ink-600" />}
        </li>
      ))}
    </ol>
  )
}

// camera + oval + real face reading. onDescriptor gets the averaged face print and
// returns an error text to show, or null when it succeeded.
export function FaceCapture({ label, onDescriptor }) {
  const video = useRef(null)
  const [cam, setCam] = useState('starting')
  const [model, setModel] = useState('loading')
  const [msg, setMsg] = useState('Place your face inside the oval.')
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState(false)

  useEffect(() => {
    let stream
    let cancelled = false
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) video.current.srcObject = s
        setCam('on')
      })
      .catch(() => setCam('off'))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    loadFace().then(() => setModel('ready')).catch(() => setModel('error'))
  }, [])

  // live check: the oval turns green when a face is found, so you can fix light and position first
  useEffect(() => {
    if (cam !== 'on' || model !== 'ready' || busy) return
    let stop = false
    let running = false
    const t = setInterval(async () => {
      if (running) return
      running = true
      const ok = await faceVisible(video.current)
      running = false
      if (!stop) setFound(ok)
    }, 700)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [cam, model, busy])

  async function run() {
    setBusy(true)
    const samples = []
    for (let tries = 0; tries < 15 && samples.length < 3; tries++) {
      setMsg('Hold still… ' + samples.length + ' / 3')
      const d = await readFace(video.current)
      if (d) samples.push(d)
      await wait(250)
    }
    if (samples.length < 3) {
      setMsg('No clear face found. Face the camera in good light.')
      return setBusy(false)
    }
    setMsg('Checking…')
    const err = await onDescriptor(average(samples))
    if (err) setMsg(err)
    setBusy(false)
  }

  const note =
    cam === 'off' ? 'Camera is blocked. Allow camera access for this site, then reload.'
    : model === 'error' ? 'Could not load the face model. Check your internet and reload.'
    : cam === 'starting' ? 'Starting the camera…'
    : model === 'loading' ? 'Loading the face model (first time only)…'
    : ''

  return (
    <div className="mt-6 space-y-4">
      <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-3xl border border-ink-600 bg-ink-800">
        <video ref={video} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        <div className={'pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 transition-colors ' + (found ? 'border-emerald-400' : 'border-dashed border-gold-500')} />
        {note && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-sm text-mist">{note}</p>}
      </div>
      {!note && !busy && <p className={'text-center text-xs ' + (found ? 'text-emerald-300' : 'text-gold-400')}>{found ? 'Face found. Tap the button.' : 'No face found yet. Face a light, look straight at the camera, and wipe the lens.'}</p>}
      <p className="flex items-center justify-center gap-2 text-center text-sm text-mist"><ShieldCheck size={16} className="shrink-0 text-gold-400" /> {msg}</p>
      <button className={button} disabled={busy || cam !== 'on' || model !== 'ready'} onClick={run}>{busy ? 'Reading your face…' : label}</button>
    </div>
  )
}
