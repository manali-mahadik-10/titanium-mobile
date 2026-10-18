// Real on-device authentication: password hash, TOTP OTP, fingerprint (WebAuthn), lockout.
// Everything is stored in this browser's localStorage. There is no server.

const ACCOUNT = 'titanium-account'
const LOCK = 'titanium-lock'

const enc = new TextEncoder()
const toHex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const fromHex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)))
const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

/* ---------- account ---------- */

export const getAccount = () => read(ACCOUNT)

function saveAccount(patch) {
  localStorage.setItem(ACCOUNT, JSON.stringify({ ...getAccount(), ...patch }))
}

export function eraseAll() {
  Object.keys(localStorage).filter((k) => k.startsWith('titanium-')).forEach((k) => localStorage.removeItem(k))
}

async function pbkdf2(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: 150000 }, key, 256)
  return toHex(bits)
}

const same = (a, b) => {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export async function registerAccount({ name, username, password, secret, face }) {
  const salt = toHex(randomBytes(16))
  const hash = await pbkdf2(password, salt)
  localStorage.setItem(ACCOUNT, JSON.stringify({ v: 1, name, username, salt, hash, secret, face, cred: null, lastStep: 0 }))
}

export async function checkPassword(username, password) {
  const a = getAccount()
  if (!a) return false
  const hash = await pbkdf2(password, a.salt) // always computed, so timing does not reveal the username
  return a.username === username.trim().toLowerCase() && same(hash, a.hash)
}

/* ---------- lockout: 5 wrong attempts = 60 s, survives a page refresh ---------- */

export function lockLeft() {
  const s = read(LOCK) || {}
  return Math.max(0, Math.ceil(((s.until || 0) - Date.now()) / 1000))
}

export function recordFail() {
  const s = read(LOCK) || {}
  const n = (s.n || 0) + 1
  if (n >= 5) {
    localStorage.setItem(LOCK, JSON.stringify({ n: 0, until: Date.now() + 60000 }))
    return 0
  }
  localStorage.setItem(LOCK, JSON.stringify({ n, until: 0 }))
  return 5 - n
}

export const clearFails = () => localStorage.removeItem(LOCK)

/* ---------- TOTP (RFC 6238), works with Google Authenticator ---------- */

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function newSecret() {
  let bits = ''
  for (const b of randomBytes(20)) bits += b.toString(2).padStart(8, '0')
  return bits.match(/.{5}/g).map((c) => B32[parseInt(c, 2)]).join('')
}

function b32decode(s) {
  let bits = ''
  for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0')
  return new Uint8Array(bits.match(/.{8}/g).map((b) => parseInt(b, 2)))
}

export async function hotp(keyBytes, counter) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const msg = new ArrayBuffer(8)
  new DataView(msg).setBigUint64(0, BigInt(counter))
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg))
  const o = h[19] & 15
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1000000).padStart(6, '0')
}

// returns the matching 30-second step (allows 1 step of clock drift) or null
export async function findTotpStep(secret, code) {
  const now = Math.floor(Date.now() / 30000)
  for (const d of [-1, 0, 1]) {
    if ((await hotp(b32decode(secret), now + d)) === code) return now + d
  }
  return null
}

export const otpUri = (username, secret) =>
  'otpauth://totp/TITANIUM:' + encodeURIComponent(username) + '?secret=' + secret + '&issuer=TITANIUM&algorithm=SHA1&digits=6&period=30'

// login check: the same code can never be used twice
export async function verifyOtp(code) {
  const a = getAccount()
  const step = await findTotpStep(a.secret, code)
  if (step === null || step <= (a.lastStep || 0)) return false
  saveAccount({ lastStep: step })
  return true
}

/* ---------- fingerprint lock (WebAuthn), phone app only ---------- */

export function needsGate() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  const phone = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0
  // add ?gate to the link to test the fingerprint lock on any device
  return (standalone && phone) || new URLSearchParams(location.search).has('gate')
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export const hasCredential = () => !!getAccount()?.cred

export async function fingerprintAvailable() {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    return false
  }
}

export async function enrollFingerprint() {
  const a = getAccount()
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'TITANIUM' },
      user: { id: randomBytes(16), name: a.username, displayName: a.name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
      attestation: 'none'
    }
  })
  saveAccount({ cred: b64(cred.rawId) })
}

export async function verifyFingerprint() {
  const a = getAccount()
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: unb64(a.cred), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000
    }
  })
  // byte 32 of authenticatorData holds the flags; bit 2 means "user verified" (fingerprint or screen lock)
  return (new Uint8Array(res.response.authenticatorData)[32] & 0x04) !== 0
}
