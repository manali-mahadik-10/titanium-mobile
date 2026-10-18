import { useEffect, useState } from 'react'
import { Home, ScanLine, History as HistoryIcon, ShieldCheck, Send, HandCoins, Eye, EyeOff } from 'lucide-react'
import { user, txns, inr, verdict } from './data'
import Mark from './Mark'
import Login from './Login'
import Pay from './Pay'
import Scan from './Scan'
import History from './History'
import Security, { defaultPolicies } from './Security'
import { buildSeedChain } from './chain'
import Register from './Register'
import Gate from './Gate'
import { getAccount, needsGate } from './auth'

const SESSION_MS = 30 * 60 * 1000
const STORE = 'titanium-v1'

const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(STORE))
    return s && Array.isArray(s.list) && s.list.every((t) => t.hash) ? s : null
  } catch {
    return null
  }
}

const tabs = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'scan', label: 'Scan', Icon: ScanLine },
  { id: 'history', label: 'History', Icon: HistoryIcon },
  { id: 'security', label: 'Security', Icon: ShieldCheck }
]

const chip = {
  Allowed: 'bg-emerald-400/15 text-emerald-300',
  Review: 'bg-gold-500/15 text-gold-400',
  Blocked: 'bg-rose-400/15 text-rose-300'
}

function HomeScreen({ go, balance, list, pay }) {
  const [show, setShow] = useState(false)
  const actions = [
    { label: 'Scan & pay', Icon: ScanLine, to: 'scan' },
    { label: 'Send money', Icon: Send, to: 'pay' },
    { label: 'Request', Icon: HandCoins, to: 'home' },
    { label: 'History', Icon: HistoryIcon, to: 'history' }
  ]
  return (
    <div className="px-5 safe-top">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mark size={36} />
          <div>
            <p className="text-sm text-mist">Welcome back</p>
            <p className="font-display text-lg leading-tight">{user.name}</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-800 px-3 py-1.5 text-xs text-mist">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Shield active
        </span>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-3xl border border-gold-500/30 bg-ink-800 p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 opacity-15"><Mark size={190} /></div>
        <p className="text-sm text-mist">Account balance</p>
        <div className="mt-1 flex items-center gap-3">
          <p className="font-mono text-3xl font-semibold">{show ? inr(balance) : '₹ ••••••'}</p>
          <button onClick={() => setShow(!show)} aria-label="Show or hide balance" className="rounded-full p-2 text-gold-400 active:bg-ink-700">
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <p className="mt-4 text-sm text-mist">UPI ID <span className="text-cream">{user.upi}</span></p>
      </section>

      <section className="mt-5 grid grid-cols-4 gap-3">
        {actions.map(({ label, Icon, to }) => (
          <button key={label} onClick={() => (to === 'pay' ? pay() : go(to))} className="flex flex-col items-center gap-2 rounded-2xl bg-cream px-1 py-4 text-ink-900 transition-transform active:scale-95">
            <Icon size={24} strokeWidth={2.2} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </section>

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg">Recent payments</h2>
          <button onClick={() => go('history')} className="text-sm text-gold-400">See all</button>
        </div>
        <ul className="mt-3 divide-y divide-ink-700 rounded-2xl border border-ink-700 bg-ink-800/70">
          {list.slice(0, 4).map((t) => {
            const v = verdict(t.risk)
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-700 font-display text-base text-gold-400">{t.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-mist">{t.time}</p>
                </div>
                <div className="text-right">
                  <p className={'font-mono text-sm font-medium ' + (t.amount > 0 ? 'text-emerald-300' : 'text-cream')}>{(t.amount > 0 ? '+' : '−') + inr(t.amount)}</p>
                  <span className={'mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ' + chip[v]}>{v}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [authed, setAuthed] = useState(false)
  const [saved] = useState(load)
  const [balance, setBalance] = useState(saved ? saved.balance : user.balance)
  const [list, setList] = useState(saved ? saved.list : txns)
  const [paying, setPaying] = useState(false)
  const [payInit, setPayInit] = useState(null)
  const [policies, setPolicies] = useState(defaultPolicies)
  const [sessionEnd, setSessionEnd] = useState(0)
  const [expired, setExpired] = useState(false)
  const [account, setAccount] = useState(getAccount)
  const [unlocked, setUnlocked] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)

  // gives the sample payments real, linked hashes when the app starts
  useEffect(() => {
    if (!saved) buildSeedChain(txns).then(setList)
  }, [saved])

  // saves payments and balance (only once every block has its hash)
  useEffect(() => {
    if (!list.every((t) => t.hash)) return
    try {
      localStorage.setItem(STORE, JSON.stringify({ list, balance }))
    } catch {
      /* storage full or blocked: the app still works, it just won't remember */
    }
  }, [list, balance])

  // signs you out when the session time runs out
  useEffect(() => {
    if (!authed) return
    const t = setTimeout(() => {
      setAuthed(false)
      setPaying(false)
      setExpired(true)
    }, Math.max(0, sessionEnd - Date.now()))
    return () => clearTimeout(t)
  }, [authed, sessionEnd])

  function resetData() {
    localStorage.removeItem(STORE)
    setBalance(user.balance)
    buildSeedChain(txns).then(setList)
  }

  // 1) no account on this device yet: register
  if (!account) {
    return <Register onDone={() => { setAccount(getAccount()); setJustRegistered(true) }} />
  }

  // 2) installed phone app: fingerprint lock first
  if (needsGate() && !unlocked) return <Gate onDone={() => setUnlocked(true)} />

  // 3) not logged in: password, OTP, face
  if (!authed) {
    return (
      <Login
        notice={expired ? 'Your session expired for your safety. Please sign in again.' : justRegistered ? 'Account created. Sign in to continue.' : ''}
        onDone={() => {
          Object.assign(user, { name: account.name, upi: account.username + '@titanium' })
          setSessionEnd(Date.now() + SESSION_MS)
          setExpired(false)
          setJustRegistered(false)
          setTab('home')
          setAuthed(true)
        }}
      />
    )
  }

  function openPay(init) {
    setPayInit(init || null)
    setPaying(true)
  }

  function finishPay(txn, paid) {
    setList([txn, ...list])
    if (paid) setBalance(balance + txn.amount)
    setPaying(false)
  }

  function signOut() {
    setAuthed(false)
    setPaying(false)
  }

  const prevHash = list.find((t) => t.hash)?.hash || '0'.repeat(64)

  return (
    <div className="mx-auto min-h-full max-w-md pb-28">
      {tab === 'home' && <HomeScreen go={setTab} balance={balance} list={list} pay={() => openPay()} />}
      {tab === 'scan' && <Scan onPay={openPay} />}
      {tab === 'history' && <History list={list} setList={setList} />}
      {tab === 'security' && <Security policies={policies} setPolicies={setPolicies} list={list} sessionEnd={sessionEnd} setSessionEnd={setSessionEnd} onReset={resetData} onSignOut={signOut} />}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-ink-700 bg-ink-900/95 backdrop-blur">
        <ul className="grid grid-cols-4">
          {tabs.map(({ id, label, Icon }) => (
            <li key={id}>
              <button onClick={() => setTab(id)} className={'flex w-full flex-col items-center gap-1 py-3 text-xs ' + (tab === id ? 'text-gold-400' : 'text-mist')}>
                <Icon size={22} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {paying && <Pay balance={balance} prevHash={prevHash} initial={payInit} onClose={() => setPaying(false)} onFinish={finishPay} />}
    </div>
  )
}