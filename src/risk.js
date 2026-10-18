const recent = []
export const AVG_30_DAY = 3000

export const recordTxn = () => recent.push(Date.now())

const velocity = () => {
  const now = Date.now()
  return recent.filter((t) => now - t < 60000).length
}

// fuzzy "high escalation" membership, same shape as the paper
const muHigh = (e) => Math.min(1, Math.max(0, (e - 2.5) / 2))

export function scoreTxn({ amount, newPayee, hour, newDevice, geoJump }) {
  const e = amount / AVG_30_DAY
  const v = velocity()
  const high = muHigh(e)

  // pretend Random Forest fraud probability
  const pRf = Math.min(0.95, 0.03 + high * 0.5 + (newPayee ? 0.1 : 0) + (newDevice ? 0.1 : 0) + (geoJump ? 0.15 : 0))
  // fuzzy logic contribution
  const rF = Math.min(1, high * 0.7 + (Math.min(v, 5) / 5) * 0.3)

  const rules = []
  if (v >= 2) rules.push({ id: 'R001', name: '3 payments within 60 seconds', pts: 20 })
  if (newPayee && (hour >= 22 || hour < 5)) rules.push({ id: 'R002', name: 'New payee at night', pts: 15 })
  if (geoJump) rules.push({ id: 'R003', name: 'Location jumped between cities', pts: 18 })
  if (newDevice && amount > 10000) rules.push({ id: 'R004', name: 'New device with a high amount', pts: 12 })
  if (amount >= 3 * AVG_30_DAY) rules.push({ id: 'R005', name: 'Amount is 3x your 30-day average', pts: 15 })

  const extra = rules.reduce((s, r) => s + r.pts, 0)
  const score = Math.min(100, Math.round(100 * (0.65 * pRf + 0.35 * rF) + extra))
  const verdict = score < 30 ? 'ALLOW' : score < 70 ? 'REVIEW' : 'BLOCK'
  return { score, verdict, rules, pRf, rF }
}