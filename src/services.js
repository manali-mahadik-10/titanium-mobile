export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEMO_PASSWORD = 'titanium123'

// pretends to check the password on a server
export async function checkPassword(id, pw) {
  await wait(900)
  return pw === DEMO_PASSWORD
}

// pretends to send an OTP and returns a random 6 digit code
export async function sendOtp() {
  await wait(700)
  return String(Math.floor(100000 + Math.random() * 900000))
}

// makes a SHA-256 fingerprint, used for the audit hash
export async function sha256(text) {
  if (!globalThis.crypto?.subtle) {
    let h = 5381
    for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0
    return h.toString(16).padStart(8, '0').repeat(8)
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}