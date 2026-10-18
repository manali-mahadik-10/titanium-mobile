import { useState } from 'react'
import { Link2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { inr, verdict } from './data'
import { GENESIS, verifyChain } from './chain'

const chip = {
  Allowed: 'bg-emerald-400/15 text-emerald-300',
  Review: 'bg-gold-500/15 text-gold-400',
  Blocked: 'bg-rose-400/15 text-rose-300'
}
const filters = ['All', 'Allowed', 'Review', 'Blocked']
const short = (h) => (h ? h.slice(0, 10) + '…' + h.slice(-6) : '—')

export default function History({ list, setList }) {
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState(null)
  const [report, setReport] = useState(null)

  // the report only counts if it was made for the current list
  const rep = report && report.list === list ? report : null
  const ready = list.every((t) => t.hash)
  const tampered = list.some((t) => t.origAmount !== undefined)
  const shown = list.filter((t) => filter === 'All' || verdict(t.risk) === filter)
  const blockNo = (t) => list.length - list.indexOf(t)

  async function verify() {
    setReport({ ...(await verifyChain(list)), list })
  }

  async function attack() {
    const k = Math.max(0, list.length - 3)
    const bad = list.map((t, i) => (i === k ? { ...t, origAmount: t.amount, amount: t.amount * 2 } : t))
    setOpen(null)
    setList(bad)
    setReport({ ...(await verifyChain(bad)), list: bad })
  }

  async function restore() {
    const fixed = list.map((t) => (t.origAmount !== undefined ? { ...t, amount: t.origAmount, origAmount: undefined } : t))
    setOpen(null)
    setList(fixed)
    setReport({ ...(await verifyChain(fixed)), list: fixed })
  }

  return (
    <div className="safe-top px-5">
      <h1 className="font-display text-2xl">History</h1>

      <section className="mt-4 rounded-2xl border border-gold-500/30 bg-ink-800 p-4">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-gold-400" />
          <h2 className="font-display text-lg">Blockchain audit trail</h2>
        </div>
        <p className="mt-1 text-sm text-mist">Every payment is a block linked to the one before it. Change one block and every block after it breaks.</p>

        {rep && (rep.valid ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck size={18} /> All {list.length} blocks verified. Chain is intact.</p>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-rose-300"><ShieldAlert size={18} /> Tampering found at block #{rep.firstBad}. Every block after it is now invalid.</p>
        ))}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          <div className="w-24 shrink-0 rounded-xl border border-ink-600 bg-ink-900/60 p-2.5 text-xs">
            <p className="text-mist">#0</p>
            <p className="mt-1 font-medium">Genesis</p>
            <p className="mt-1 font-mono text-[10px] text-mist">{GENESIS.slice(0, 8)}</p>
          </div>
          {[...list].reverse().map((t, i) => {
            const ok = rep ? rep.results[t.id] : null
            const border = ok === null ? 'border-ink-600' : ok ? 'border-emerald-400/60' : 'border-rose-400'
            return (
              <button key={t.id} onClick={() => setOpen(t)} className={'w-24 shrink-0 rounded-xl border bg-ink-900/60 p-2.5 text-left text-xs ' + border}>
                <p className="text-mist">#{i + 1}</p>
                <p className="mt-1 truncate font-medium">{t.name}</p>
                <p className={'mt-1 font-mono text-[10px] ' + (ok === false ? 'text-rose-300' : 'text-mist')}>{(t.hash || '').slice(0, 8)}</p>
              </button>
            )
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button disabled={!ready} onClick={verify} className="rounded-xl bg-gold-500 py-3 text-sm font-semibold text-ink-900 disabled:opacity-50">Verify chain</button>
          {tampered ? (
            <button onClick={restore} className="rounded-xl border border-gold-500 py-3 text-sm font-medium text-gold-400">Restore</button>
          ) : (
            <button disabled={!ready} onClick={attack} className="rounded-xl border border-rose-400 py-3 text-sm font-medium text-rose-300 disabled:opacity-50">Simulate attack</button>
          )}
        </div>
      </section>

      <div className="mt-5 flex gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={'rounded-full border px-3 py-1.5 text-sm ' + (filter === f ? 'border-gold-500 text-gold-400' : 'border-ink-600 text-mist')}>{f}</button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-800/70">
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-mist">No payments here yet.</li>}
        {shown.map((t) => {
          const v = verdict(t.risk)
          return (
            <li key={t.id}>
              <button onClick={() => setOpen(t)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-700 font-display text-base text-gold-400">{t.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-mist">{t.time}</p>
                </div>
                <div className="text-right">
                  <p className={'font-mono text-sm font-medium ' + (t.amount > 0 ? 'text-emerald-300' : 'text-cream')}>{(t.amount > 0 ? '+' : '−') + inr(t.amount)}</p>
                  <span className={'mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ' + chip[v]}>{v}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(null)} />
          <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[85vh] max-w-md overflow-y-auto rounded-t-3xl border-t border-gold-500/30 bg-ink-800 p-5 pb-8">
            <h2 className="font-display text-2xl">{open.name}</h2>
            <p className="mt-1 font-mono text-2xl">{(open.amount > 0 ? '+' : '−') + inr(open.amount)}</p>
            <h3 className="mt-5 text-sm text-gold-400">Audit proof</h3>
            <dl className="mt-2 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-900/60 text-sm">
              {[
                ['Transaction ID', open.txnId],
                ['Time', open.time],
                ['Risk score', open.risk + ' / 100'],
                ['Rules fired', open.rules?.length ? open.rules.join(', ') : 'None'],
                ['Block number', '#' + blockNo(open)],
                ['Previous hash', short(open.prev)],
                ['Block hash', short(open.hash)],
                ['Audit check', rep ? (rep.results[open.id] ? 'Verified' : 'Tampered') : 'Not checked yet']
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-mist">{k}</dt>
                  <dd className={'break-all text-right font-mono text-xs ' + (v === 'Tampered' ? 'text-rose-300' : v === 'Verified' ? 'text-emerald-300' : '')}>{v}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => setOpen(null)} className="mt-5 w-full rounded-xl bg-gold-500 py-3.5 font-semibold text-ink-900">Close</button>
          </div>
        </>
      )}
    </div>
  )
}