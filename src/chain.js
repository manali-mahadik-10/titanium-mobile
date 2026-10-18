import { sha256 } from './services'

export const GENESIS = '0'.repeat(64)

// the same recipe the pay flow uses to make each block's hash
export const blockHash = (prev, t) =>
  sha256([prev, t.txnId, t.name, Math.abs(t.amount), t.risk, t.risk >= 70 ? 'blocked' : 'paid'].join('|'))

// gives the sample payments real hashes, linked one after another (oldest first)
export async function buildSeedChain(items) {
  const oldest = [...items].reverse()
  let prev = GENESIS
  const done = []
  for (const t of oldest) {
    const x = { ...t, txnId: t.txnId || 'TXN' + (10000000 + t.id * 7919), prev }
    x.hash = await blockHash(prev, x)
    prev = x.hash
    done.push(x)
  }
  return done.reverse()
}

// rebuilds the whole chain from the start and compares with the saved hashes
export async function verifyChain(list) {
  const oldest = [...list].reverse()
  let prev = GENESIS
  const results = {}
  let firstBad = null
  for (let i = 0; i < oldest.length; i++) {
    const h = await blockHash(prev, oldest[i])
    const ok = h === oldest[i].hash
    results[oldest[i].id] = ok
    if (!ok && firstBad === null) firstBad = i + 1
    prev = h
  }
  return { valid: firstBad === null, results, firstBad }
}