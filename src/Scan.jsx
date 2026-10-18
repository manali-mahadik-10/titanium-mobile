import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { ShieldAlert, ShieldCheck, ShieldQuestion, ExternalLink } from 'lucide-react'
import { checkUrl } from './phishing'
import { inr } from './data'

const demos = [
  ['Merchant QR', 'upi://pay?pa=tech@titanium&pn=Tech%20Solutions&am=500'],
  ['Official NPCI link', 'https://npci.org.in/upi'],
  ['Cashback offer link', 'http://upi-cashback.in/offers?ref=1'],
  ['Fake SBI link', 'https://sbi-kycupdate.netlify.app/login']
]

const meta = {
  SAFE: { Icon: ShieldCheck, color: 'text-emerald-300', bg: 'bg-emerald-400/15', title: 'Looks safe' },
  SUSPICIOUS: { Icon: ShieldQuestion, color: 'text-gold-400', bg: 'bg-gold-500/15', title: 'Suspicious link' },
  PHISHING: { Icon: ShieldAlert, color: 'text-rose-300', bg: 'bg-rose-400/15', title: 'Phishing link detected' }
}
const dot = (f) => (f === 0 ? 'bg-emerald-400' : f === 0.5 ? 'bg-gold-500' : 'bg-rose-400')

export default function Scan({ onPay }) {
  const video = useRef(null)
  const canvas = useRef(null)
  const paused = useRef(false)
  const [cam, setCam] = useState('starting')
  const [result, setResult] = useState(null)
  const [link, setLink] = useState('')

  function handle(raw) {
    paused.current = true
    const text = raw.trim()
    if (/^upi:\/\//i.test(text)) {
      const p = new URLSearchParams(text.split('?')[1] || '')
      setResult({ kind: 'upi', pa: p.get('pa') || '', name: p.get('pn') || p.get('pa') || 'Unknown', am: p.get('am') || '' })
    } else if (/^https?:\/\//i.test(text) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(text)) {
      setResult({ kind: 'url', text, ...checkUrl(text) })
    } else {
      setResult({ kind: 'text', text })
    }
  }

  function reset() {
    setResult(null)
    paused.current = false
  }

  useEffect(() => {
    let stream
    let raf
    let last = 0
    let cancelled = false

    function loop(t) {
      raf = requestAnimationFrame(loop)
      if (t - last < 200 || paused.current) return
      last = t
      const v = video.current
      if (!v || v.readyState < 2 || !v.videoWidth) return
      const c = canvas.current
      const w = 480
      const h = Math.round((v.videoHeight / v.videoWidth) * w)
      c.width = w
      c.height = h
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(v, 0, 0, w, h)
      const code = jsQR(g.getImageData(0, 0, w, h).data, w, h)
      if (code?.data) handle(code.data)
    }

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) video.current.srcObject = s
        setCam('on')
        raf = requestAnimationFrame(loop)
      })
      .catch(() => setCam('off'))

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="safe-top px-5">
      <h1 className="font-display text-2xl">Scan & pay</h1>
      <p className="mt-1 text-sm text-mist">Point the camera at a UPI QR code. Any link inside is checked for phishing first.</p>

      <div className="relative mt-5 aspect-square w-full overflow-hidden rounded-3xl border border-ink-600 bg-ink-800">
        <video ref={video} autoPlay playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvas} className="hidden" />
        <div className="pointer-events-none absolute inset-[14%]">
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-gold-500" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-gold-500" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-gold-500" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-gold-500" />
        </div>
        {cam === 'on' && <div className="sweep pointer-events-none absolute inset-x-[14%] h-0.5 bg-gold-500/80 shadow-[0_0_12px_#f2a71b]" />}
        {cam !== 'on' && (
          <p className="absolute inset-x-8 top-1/2 -translate-y-1/2 text-center text-sm text-mist">
            {cam === 'starting' ? 'Starting the camera…' : 'Camera is not available here. Use the demo buttons below.'}
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-mist">Try a demo</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {demos.map(([label, value]) => (
          <button key={label} onClick={() => handle(value)} className="rounded-full border border-ink-600 px-3 py-1.5 text-sm text-cream active:bg-ink-800">{label}</button>
        ))}
      </div>

      <p className="mt-6 text-sm text-mist">Or paste a link to check</p>
      <div className="mt-2 flex gap-2">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="min-w-0 flex-1 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-base text-cream outline-none focus:border-gold-500" />
        <button disabled={!link.trim()} onClick={() => handle(link)} className="rounded-xl bg-gold-500 px-4 font-semibold text-ink-900 disabled:opacity-50">Check</button>
      </div>

      {result && (
        <>
          <div className="fixed inset-0 z-30 bg-black/60" onClick={reset} />
          <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[85vh] max-w-md overflow-y-auto rounded-t-3xl border-t border-gold-500/30 bg-ink-800 p-5 pb-8">
            {result.kind === 'upi' && (
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink-700 font-display text-2xl text-gold-400">{result.name[0]}</span>
                <h2 className="mt-3 font-display text-2xl">{result.name}</h2>
                <p className="font-mono text-sm text-mist">{result.pa}</p>
                {result.am && <p className="mt-2 font-mono text-2xl">{inr(Number(result.am))}</p>}
                {result.pa ? (
                  <button onClick={() => { const p = { to: result.pa, amount: result.am }; reset(); onPay(p) }} className="mt-5 w-full rounded-xl bg-gold-500 py-3.5 font-semibold text-ink-900">Pay securely</button>
                ) : (
                  <p className="mt-4 text-sm text-rose-300">This is not a valid payment code.</p>
                )}
                <button onClick={reset} className="mt-3 w-full py-2 text-sm text-mist">Cancel</button>
              </div>
            )}

            {result.kind === 'url' && (() => {
              const m = meta[result.verdict]
              return (
                <div>
                  <div className="flex items-center gap-3">
                    <span className={'grid h-12 w-12 shrink-0 place-items-center rounded-full ' + m.bg + ' ' + m.color}><m.Icon size={26} /></span>
                    <div className="min-w-0">
                      <h2 className={'font-display text-xl ' + m.color}>{m.title}</h2>
                      <p className="truncate font-mono text-xs text-mist">{result.host}</p>
                    </div>
                    <span className="ml-auto font-mono text-lg">{result.confidence}%</span>
                  </div>
                  <ul className="mt-4 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-900/60 text-sm">
                    {result.signals.map((s) => (
                      <li key={s.name} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={'h-2.5 w-2.5 shrink-0 rounded-full ' + dot(s.flag)} />
                        <span className="w-28 shrink-0 text-mist">{s.name}</span>
                        <span className="text-xs">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                  {result.verdict === 'SAFE' ? (
                    <a href={result.href} target="_blank" rel="noopener noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3.5 font-semibold text-ink-900">Open link <ExternalLink size={18} /></a>
                  ) : (
                    <p className="mt-4 text-center text-sm text-rose-300">Do not open this link or enter any details.</p>
                  )}
                  <button onClick={reset} className="mt-3 w-full py-2 text-sm text-mist">{result.verdict === 'SAFE' ? 'Close' : 'Go back'}</button>
                </div>
              )
            })()}

            {result.kind === 'text' && (
              <div className="text-center">
                <h2 className="font-display text-xl">Not a payment or a link</h2>
                <p className="mt-2 break-all text-sm text-mist">{result.text}</p>
                <button onClick={reset} className="mt-4 w-full py-2 text-sm text-gold-400">Scan again</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}