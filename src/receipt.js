import { inr } from './data'

export async function makeReceipt({ amount, payee, id }) {
  try {
    await Promise.all(['48px "DM Serif Display"', '600 72px "IBM Plex Mono"', '30px "DM Sans"'].map((f) => document.fonts.load(f)))
  } catch { /* fonts not ready, the fallback fonts are used */ }

  const W = 720
  const H = 1000
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')

  g.fillStyle = '#0b1426'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = '#f2a71b'
  g.lineWidth = 3
  g.strokeRect(24, 24, W - 48, H - 48)

  // green tick
  g.fillStyle = 'rgba(52,211,153,0.15)'
  g.beginPath()
  g.arc(W / 2, 200, 70, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#34d399'
  g.lineWidth = 10
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(W / 2 - 30, 200)
  g.lineTo(W / 2 - 8, 224)
  g.lineTo(W / 2 + 34, 176)
  g.stroke()

  g.textAlign = 'center'
  g.fillStyle = '#f5efe3'
  g.font = '48px "DM Serif Display", serif'
  g.fillText('Payment successful', W / 2, 340)
  g.font = '600 72px "IBM Plex Mono", monospace'
  g.fillText(inr(amount), W / 2, 440)
  g.fillStyle = '#8fa0bd'
  g.font = '30px "DM Sans", sans-serif'
  g.fillText('paid to ' + payee, W / 2, 500)

  const when = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  const rows = [['Date & time', when], ['Transaction ID', id], ['Status', 'Completed']]
  rows.forEach(([k, v], i) => {
    const y = 620 + i * 80
    g.strokeStyle = '#1b2c4d'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(70, y - 45)
    g.lineTo(W - 70, y - 45)
    g.stroke()
    g.font = '28px "DM Sans", sans-serif'
    g.fillStyle = '#8fa0bd'
    g.textAlign = 'left'
    g.fillText(k, 80, y)
    g.fillStyle = '#f5efe3'
    g.textAlign = 'right'
    g.fillText(v, W - 80, y)
  })

  g.textAlign = 'center'
  g.fillStyle = '#f2a71b'
  g.font = '600 30px "DM Sans", sans-serif'
  g.fillText('Secured by TITANIUM', W / 2, 890)
  g.fillStyle = '#8fa0bd'
  g.font = '24px "DM Sans", sans-serif'
  g.fillText('Every transaction, verified in real time', W / 2, 935)

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'))
}