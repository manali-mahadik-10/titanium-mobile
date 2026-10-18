const TRUSTED = ['sbi.co.in', 'onlinesbi.sbi', 'hdfcbank.com', 'icicibank.com', 'axisbank.com', 'npci.org.in', 'rbi.org.in', 'paytm.com', 'phonepe.com', 'amazon.in', 'google.com']
const BRANDS = ['sbi', 'hdfc', 'icici', 'axis', 'npci', 'paytm', 'phonepe', 'upi', 'kyc']
const RISKY = ['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.click', '.work', '.live', '.netlify.app', '.vercel.app', '.pages.dev', '.github.io', '.web.app', '.firebaseapp.com', '.000webhostapp.com']
const CRED = ['login', 'signin', 'verify', 'kyc', 'update', 'secure', 'account', 'otp', 'password', 'confirm', 'reward', 'claim']
const WEIGHTS = [0.1, 0.3, 0.15, 0.15, 0.2, 0.1]

export function checkUrl(input) {
  let raw = input.trim()
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = 'https://' + raw
  let u
  try {
    u = new URL(raw)
  } catch {
    return { verdict: 'SUSPICIOUS', confidence: 60, href: raw, host: raw, signals: [] }
  }

  const host = u.hostname.toLowerCase().replace(/^www\./, '')
  const trusted = TRUSTED.some((t) => host === t || host.endsWith('.' + t))
  const brand = BRANDS.some((b) => host.includes(b))
  const risky = RISKY.some((s) => host.endsWith(s))
  const cred = !trusted && CRED.some((w) => (host + u.pathname).toLowerCase().includes(w))
  const young = !trusted && (risky || brand || /[-\d]/.test(host.split('.')[0]))
  const hasQuery = u.search.length > 1

  // 0 = good, 0.5 = unsure, 1 = bad
  const f = [u.protocol === 'https:' ? 0 : 1, trusted ? 0 : brand ? 1 : 0.5, risky ? 1 : 0, cred ? 1 : 0, young ? 1 : 0, hasQuery ? 0.5 : 0]

  const sum = f.reduce((s, x, i) => s + x * WEIGHTS[i], 0)
  const c = Math.min(0.99, Math.max(0.04, sum * 1.18))
  const verdict = c >= 0.9 ? 'PHISHING' : c >= 0.6 ? 'SUSPICIOUS' : 'SAFE'
  const confidence = Math.round((verdict === 'SAFE' ? 1 - c : c) * 100)

  const signals = [
    { name: 'Connection', flag: f[0], text: f[0] ? 'HTTP, not encrypted' : 'HTTPS, encrypted' },
    { name: 'Domain trust', flag: f[1], text: trusted ? 'Verified bank or payment site' : brand ? 'Pretends to be a bank brand' : 'Unknown domain' },
    { name: 'Domain ending', flag: f[2], text: risky ? 'Risky or free-hosting ending' : 'Normal ending' },
    { name: 'Login words', flag: f[3], text: cred ? 'Asks for login, KYC or verify' : 'None found' },
    { name: 'Domain age', flag: f[4], text: young ? 'Looks newly registered (estimated)' : 'Looks established' },
    { name: 'Extra parameters', flag: f[5], text: hasQuery ? 'Has query parameters' : 'None' }
  ]
  return { verdict, confidence, href: u.href, host, signals }
}