import React, { useMemo, memo } from 'react'

/**
 * DOMParticles — CSS-animated seasonal particle overlay
 * ──────────────────────────────────────────────────────
 * Renders weather-appropriate particles as DOM elements on top of the 3D canvas.
 * This avoids all 3D coordinate issues and always renders in the correct viewport area.
 */

// ─── Particle configs per season ──────────────────────
const SEASON_CONFIG = {
  winter: {
    count: 80,
    symbols: ['❄', '❅', '❆', '✦'],
    colors: ['#ffffff', '#e0f0ff', '#c8e6ff', '#daeeff'],
    sizeRange: [10, 28],
    fallDuration: [4, 10],   // seconds (min, max)
    swayAmount: [60, 160],   // px horizontal sway
    opacity: [0.5, 1.0],
    className: 'snow',
  },
  autumn: {
    count: 50,
    symbols: ['🍂', '🍁', '🍃', '🌿'],
    colors: ['#e8713a', '#d94824', '#a82e16', '#cca122', '#ff5522'],
    sizeRange: [14, 26],
    fallDuration: [5, 14],
    swayAmount: [80, 250],
    opacity: [0.7, 1.0],
    className: 'leaf',
  },
  spring: {
    count: 100,
    symbols: ['│', '│', '│', '╎'],
    colors: ['#88ccff', '#6fb8f7', '#a0d8ff', '#78bef5'],
    sizeRange: [8, 16],
    fallDuration: [1.0, 2.5],
    swayAmount: [5, 20],
    opacity: [0.3, 0.7],
    className: 'rain',
  },
  summer: {
    count: 40,
    symbols: ['✦', '✧', '⋆', '∗', '✸'],
    colors: ['#ffdd77', '#ffe599', '#ffd54f', '#ffca28', '#fff176'],
    sizeRange: [8, 20],
    fallDuration: [6, 16],
    swayAmount: [80, 200],
    opacity: [0.4, 0.9],
    className: 'sparkle',
  },
}

// ─── Single particle element ──────────────────────────
const Particle = memo(({ config, index }) => {
  const style = useMemo(() => {
    const cfg = config
    const symbol = cfg.symbols[index % cfg.symbols.length]
    const color = cfg.colors[index % cfg.colors.length]
    const size = cfg.sizeRange[0] + Math.random() * (cfg.sizeRange[1] - cfg.sizeRange[0])
    const duration = cfg.fallDuration[0] + Math.random() * (cfg.fallDuration[1] - cfg.fallDuration[0])
    const delay = -Math.random() * duration  // negative = start mid-animation
    const startX = Math.random() * 100        // % from left
    const sway = cfg.swayAmount[0] + Math.random() * (cfg.swayAmount[1] - cfg.swayAmount[0])
    const opacity = cfg.opacity[0] + Math.random() * (cfg.opacity[1] - cfg.opacity[0])
    const rotSpeed = 0.5 + Math.random() * 3  // rotation speed multiplier

    return {
      symbol,
      css: {
        position: 'absolute',
        left: `${startX}%`,
        top: '-30px',
        fontSize: `${size}px`,
        color: color,
        opacity: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        willChange: 'transform, opacity',
        animation: `dom-particle-fall-${cfg.className} ${duration}s linear ${delay}s infinite`,
        '--sway': `${sway}px`,
        '--rot-speed': `${rotSpeed}`,
        filter: cfg.className === 'sparkle' ? `drop-shadow(0 0 4px ${color})` : 'none',
      },
    }
  }, [config, index])

  return (
    <span
      className={`dom-particle dom-particle-${config.className}`}
      style={style.css}
      aria-hidden="true"
    >
      {style.symbol}
    </span>
  )
})

// ─── Main component ───────────────────────────────────
function DOMParticles({ season, active }) {
  const config = SEASON_CONFIG[season]
  if (!config || !active) return null

  const particles = useMemo(() => {
    return Array.from({ length: config.count }, (_, i) => (
      <Particle key={`${season}-${i}`} config={config} index={i} />
    ))
  }, [season, config])

  return (
    <div
      className="dom-particles-container"
      id={`particles-${season}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {particles}
    </div>
  )
}

export default memo(DOMParticles)
