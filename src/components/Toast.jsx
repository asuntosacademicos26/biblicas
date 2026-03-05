import { useEffect } from 'react'

export default function Toast({ mensaje, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={s.wrapper}>
      <div style={s.toast}>
        <span style={s.icon}>✓</span>
        {mensaje}
      </div>
    </div>
  )
}

const s = {
  wrapper: {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000,
    pointerEvents: 'none',
  },
  toast: {
    background: '#276749',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: 12,
    fontSize: '1rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    animation: 'slideUp 0.25s ease',
  },
  icon: {
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '50%',
    width: 28, height: 28,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem', fontWeight: 800, flexShrink: 0,
  },
}
