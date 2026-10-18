import { useId } from 'react'

export default function Mark({ size = 40 }) {
  const uid = useId().replace(/:/g, '')
  const clip = 'clip' + uid
  const grad = 'grad' + uid
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <clipPath id={clip}><circle cx="30" cy="30" r="19" /></clipPath>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b830" stopOpacity="0" />
          <stop offset="45%" stopColor="#e8b830" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#e8b830" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#e8b830" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="30" r="30" fill="#070e16" />
      <g className="tm-orbit">
        <circle cx="30" cy="30" r="28" stroke="#c8900a" strokeWidth="1.8" strokeDasharray="5.5 4" fill="none" opacity=".95" />
        <circle className="tm-node" cx="10" cy="10" r="3.5" fill="#c8900a" />
        <circle cx="10" cy="10" r="6.5" stroke="#c8900a" strokeWidth="1" fill="none" opacity=".3" />
        <circle className="tm-node" cx="58" cy="30" r="3.5" fill="#c8900a" />
        <circle cx="58" cy="30" r="6.5" stroke="#c8900a" strokeWidth="1" fill="none" opacity=".3" />
        <circle className="tm-node" cx="30" cy="58" r="3.5" fill="#c8900a" />
        <circle cx="30" cy="58" r="6.5" stroke="#c8900a" strokeWidth="1" fill="none" opacity=".3" />
      </g>
      <circle cx="30" cy="30" r="20" fill="#070e16" />
      <circle cx="30" cy="30" r="20" stroke="#c8900a" strokeWidth="1.3" fill="none" opacity=".65" />
      <rect x="17" y="19.5" width="26" height="4" rx="0.5" fill="#c8900a" />
      <rect x="17" y="19" width="2.5" height="5.5" rx="0.3" fill="#c8900a" />
      <rect x="40.5" y="19" width="2.5" height="5.5" rx="0.3" fill="#c8900a" />
      <rect x="20" y="20.3" width="5" height="2.9" rx="0.3" fill="#070e16" />
      <rect x="35" y="20.3" width="5" height="2.9" rx="0.3" fill="#070e16" />
      <rect x="26.5" y="23.5" width="7" height="19" rx="0.5" fill="#c8900a" />
      <rect x="24" y="42.5" width="12" height="2.5" rx="0.5" fill="#c8900a" />
      <rect x="26.5" y="30" width="7" height="1" rx="0.3" fill="#070e16" opacity=".45" />
      <g clipPath={`url(#${clip})`}>
        <rect className="tm-scan" x="11" y="29" width="38" height="3.5" fill={`url(#${grad})`} rx="1.5" />
      </g>
    </svg>
  )
}