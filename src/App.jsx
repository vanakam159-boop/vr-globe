import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react'
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment, Sky } from '@react-three/drei'
import { XR, Controllers, VRButton } from '@react-three/xr'
import SeasonLighting from './components/SeasonLighting'
import * as THREE from 'three'

/**
 * CameraLogger — Logs exact camera position & angles when Free Look is locked
 * Place this inside the <Canvas> so it can access useThree().
 */
/**
 * VRInputHandler — Maps VR controller thumbstick to wheel spin
 */
function VRInputHandler({ setSpinState }) {
  const { gl } = useThree()
  const vrControllingRef = useRef(false)

  useFrame(() => {
    const session = gl.xr.getSession?.()
    if (!session) {
      if (vrControllingRef.current) {
        vrControllingRef.current = false
        setSpinState('idle')
      }
      return
    }

    let direction = 'center'
    for (const inputSource of session.inputSources || []) {
      if (inputSource.gamepad && inputSource.gamepad.axes.length > 0) {
        const x = inputSource.gamepad.axes[0] || 0
        if (x < -0.4) {
          direction = 'left'
          break
        } else if (x > 0.4) {
          direction = 'right'
          break
        }
      }
    }

    if (direction !== 'center') {
      vrControllingRef.current = true
      setSpinState(direction === 'left' ? 'spinning-left' : 'spinning-right')
    } else if (vrControllingRef.current) {
      vrControllingRef.current = false
      setSpinState('idle')
    }
  })

  return null
}

function CameraLogger({ freeLook }) {
  const { camera } = useThree()
  const prevFreeLook = useRef(freeLook)

  useEffect(() => {
    // Detect transition from Free Look ON → OFF (locking the camera)
    if (prevFreeLook.current === true && freeLook === false) {
      const pos = camera.position
      const rot = camera.rotation
      const quat = camera.quaternion

      console.log('%c╔══════════════════════════════════════════╗', 'color: #56e39f; font-weight: bold')
      console.log('%c║  📷 CAMERA LOCKED — Snapshot saved       ║', 'color: #56e39f; font-weight: bold')
      console.log('%c╚══════════════════════════════════════════╝', 'color: #56e39f; font-weight: bold')
      console.log('%cPosition:', 'color: #ffc145; font-weight: bold', {
        x: pos.x.toFixed(4),
        y: pos.y.toFixed(4),
        z: pos.z.toFixed(4),
      })
      console.log('%cRotation (radians):', 'color: #58c4dc; font-weight: bold', {
        x: rot.x.toFixed(4),
        y: rot.y.toFixed(4),
        z: rot.z.toFixed(4),
        order: rot.order,
      })
      console.log('%cRotation (degrees):', 'color: #e8713a; font-weight: bold', {
        x: THREE.MathUtils.radToDeg(rot.x).toFixed(2) + '°',
        y: THREE.MathUtils.radToDeg(rot.y).toFixed(2) + '°',
        z: THREE.MathUtils.radToDeg(rot.z).toFixed(2) + '°',
      })
      console.log('%cQuaternion:', 'color: #a78bfa; font-weight: bold', {
        x: quat.x.toFixed(4),
        y: quat.y.toFixed(4),
        z: quat.z.toFixed(4),
        w: quat.w.toFixed(4),
      })
      console.log('%cFOV:', 'color: #ff6b9d; font-weight: bold', camera.fov)
      console.log('%c─── Copy-paste for code: ───', 'color: #999')
      console.log(`camera={{ position: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}], fov: ${camera.fov} }}`)
      console.log('─────────────────────────────')
    }
    prevFreeLook.current = freeLook
  }, [freeLook, camera])

  return null
}
import SeasonWheel from './components/SeasonWheel'
import SetupOverlay from './components/SetupOverlay'
import { useBalanceBoard } from './hooks/useBalanceBoard'
import BalanceBoardUI from './components/BalanceBoardUI'
import DOMParticles from './components/DOMParticles'
import { playClick, playRumble, playSeasonChime } from './audio'

/**
 * App — Root component
 * ──────────────────────────────────────────
 * Spin-wheel game controls:
 *   ← / → : Spin the wheel (builds velocity, physics-based)
 *   ↑     : Immediate stop (snap to nearest season)
 *   Release arrow keys → friction-based gradual slowdown
 *
 * Free Look camera: full orbit + pan (middle-click / shift+drag) + zoom
 */

const SEASON_COLORS = {
  spring: '#56e39f',
  summer: '#ffc145',
  autumn: '#e8713a',
  winter: '#58c4dc',
}

const SEASON_LABELS = {
  spring: '🌸 Spring',
  summer: '☀️ Summer',
  autumn: '🍂 Autumn',
  winter: '❄️ Winter',
}

const SEASON_NAMES = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
}

const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter']
const QUEST_TARGETS = ['winter', 'summer', 'spring', 'autumn', 'winter', 'spring', 'summer', 'autumn']
const QUEST_TIME_LIMITS = [25, 22, 20, 18, 16, 14, 12, 10]
const QUEST_HOLD_SECONDS = 2
const QUEST_TICK_MS = 100
const QUEST_TICK_SECONDS = QUEST_TICK_MS / 1000
const QUEST_FEEDBACK_DELAY_MS = 1100
const QUEST_TUTORIAL_STEPS = [
  {
    title: 'Tutorial 1/4 - Spin right, then center',
    instruction: 'Tilt right or press -> to spin toward Winter. Stand centered when Winter comes close so the globe coasts and locks.',
  },
  {
    title: 'Tutorial 2/4 - Try the other side',
    instruction: 'Tilt left or press <- to spin back toward Summer. Return to center to slow down and settle on the target.',
  },
  {
    title: 'Tutorial 3/4 - Make small corrections',
    instruction: 'Use short left or right tilts to line up Spring. Each time you center, the globe slows and snaps to a season.',
  },
  {
    title: 'Tutorial 4/4 - Hold still to score',
    instruction: 'When Autumn is selected, keep the board centered and stand still until the hold bar fills.',
  },
]

function getDirectionToTarget(currentSeason, targetSeason) {
  if (currentSeason === targetSeason) return 'center'

  const currentIndex = SEASON_ORDER.indexOf(currentSeason)
  const targetIndex = SEASON_ORDER.indexOf(targetSeason)
  if (currentIndex === -1 || targetIndex === -1) return 'right'

  const rightSteps = (targetIndex - currentIndex + SEASON_ORDER.length) % SEASON_ORDER.length
  const leftSteps = (currentIndex - targetIndex + SEASON_ORDER.length) % SEASON_ORDER.length

  return rightSteps <= leftSteps ? 'right' : 'left'
}

function getLiveTutorialInstruction({
  targetSeasonName,
  turnDirection,
  spinState,
  isMoving,
  isOnTargetSeason,
  questHoldProgress,
  questStatus,
}) {
  if (questStatus === 'success') return 'Good. Stay centered and get ready for the next target.'
  if (questStatus === 'retry') return 'Time is up. Reset your balance, then try this same target again.'

  const remainingHold = Math.max(0, QUEST_HOLD_SECONDS - questHoldProgress).toFixed(1)

  if (isOnTargetSeason && isMoving) {
    return `Center now. Let ${targetSeasonName} lock in, then stand still.`
  }

  if (isOnTargetSeason) {
    return `Hold center. Stay still for ${remainingHold}s more.`
  }

  const arrow = turnDirection === 'right' ? '->' : '<-'
  const activeDirection = spinState === 'spinning-left' ? 'left' : spinState === 'spinning-right' ? 'right' : 'center'

  if (activeDirection === turnDirection) {
    return `Keep tilting ${turnDirection} until ${targetSeasonName} is selected.`
  }

  if (activeDirection !== 'center') {
    return `Switch direction. Tilt ${turnDirection} or press ${arrow} to reach ${targetSeasonName}.`
  }

  if (isMoving) {
    return `Watch the globe coast. If it misses ${targetSeasonName}, tilt ${turnDirection} again.`
  }

  return `Tilt ${turnDirection} or press ${arrow} to spin toward ${targetSeasonName}.`
}

function TabVisibilityHandler() {
  const { gl, scene, camera, invalidate } = useThree()

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        gl.clear()
        gl.render(scene, camera)
        scene.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.needsUpdate = true
          }
        })
        gl.resetState()
        invalidate()
        setTimeout(() => invalidate(), 100)
        setTimeout(() => invalidate(), 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [gl, scene, camera, invalidate])

  return null
}

function LoadingScreen() {
  return (
    <div className="loading-screen" id="loading-screen">
      <h1>🌍 Seasons Wheel</h1>
      <div className="loading-spinner" />
      <p className="loading-text">Loading 3D world…</p>
    </div>
  )
}

function SeasonSkyPanorama({ activeSeason, spinState, isMoving }) {
  // Use suspense wrapper dynamically
  const tex = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}assests/seasons_sky_panorama.png`)
  const ref = useRef()

  // Animate a gentle drift on the sky or pulse during active weather
  useEffect(() => {
    if (tex) {
      tex.mapping = THREE.EquirectangularReflectionMapping
      tex.colorSpace = THREE.SRGBColorSpace
    }
  }, [tex])

  useFrame((state, delta) => {
    if (ref.current) {
      // Gentle drift across the sky clouds naturally unless snapping
      ref.current.rotation.y += delta * 0.05
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[450, 64, 64]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} transparent opacity={0.65} />
    </mesh>
  )
}

export default function App() {
  const [season, setSeason] = useState('autumn')
  const [freeLook, setFreeLook] = useState(false)
  const [masterPos, setMasterPos] = useState([151.37, 0, 11.83])
  const [masterRot, setMasterRot] = useState([0, 0, 0])
  const [masterScale, setMasterScale] = useState([1, 1, 1])
  const [isLoaded, setIsLoaded] = useState(false)

  // Setup mode states
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [transformMode, setTransformMode] = useState('translate')
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  // spinState: 'idle' | 'spinning-left' | 'spinning-right' | 'stopping'
  const [spinState, setSpinState] = useState('idle')
  const [isMoving, setIsMoving] = useState(false)

  // Season Quest state
  const [questRoundIndex, setQuestRoundIndex] = useState(0)
  const [questTimeLeft, setQuestTimeLeft] = useState(QUEST_TIME_LIMITS[0])
  const [questHoldProgress, setQuestHoldProgress] = useState(0)
  const [questScore, setQuestScore] = useState(0)
  const [questStreak, setQuestStreak] = useState(0)
  const [questMisses, setQuestMisses] = useState(0)
  const [questStatus, setQuestStatus] = useState('playing')
  const [tutorialSkipped, setTutorialSkipped] = useState(false)

  // Balance board integration
  const {
    isConnected: isBalanceBoardConnected,
    lastDirection: balanceBoardDirection,
    error: balanceBoardError,
    connect: connectBalanceBoard,
    disconnect: disconnectBalanceBoard,
  } = useBalanceBoard()

  // Ref to track balance board direction
  const lastBalanceTiltRef = useRef('center')
  const questTransitionTimeoutRef = useRef(null)

  const questRoundCount = QUEST_TARGETS.length
  const targetSeason = QUEST_TARGETS[questRoundIndex] || QUEST_TARGETS[questRoundCount - 1]
  const targetSeasonName = SEASON_NAMES[targetSeason] || targetSeason
  const questTutorial = QUEST_TUTORIAL_STEPS[questRoundIndex]
  const showQuestTutorial = questStatus !== 'complete' && !tutorialSkipped && Boolean(questTutorial)
  const isOnTargetSeason = season === targetSeason
  const isHoldingTarget = questStatus === 'playing' && isOnTargetSeason && !isMoving
  const tutorialTurnDirection = getDirectionToTarget(season, targetSeason)
  const liveTutorialInstruction = getLiveTutorialInstruction({
    targetSeasonName,
    turnDirection: tutorialTurnDirection,
    spinState,
    isMoving,
    isOnTargetSeason,
    questHoldProgress,
    questStatus,
  })
  const questHoldPercent = Math.round((questHoldProgress / QUEST_HOLD_SECONDS) * 100)
  const questFeedback =
    questStatus === 'complete' ? 'Quest complete' :
    questStatus === 'success' ? 'Success' :
    questStatus === 'retry' ? 'Try again' :
    isHoldingTarget ? 'Hold still' :
    `Find ${targetSeasonName}`

  const clearQuestTransition = useCallback(() => {
    if (questTransitionTimeoutRef.current) {
      clearTimeout(questTransitionTimeoutRef.current)
      questTransitionTimeoutRef.current = null
    }
  }, [])

  const scheduleQuestTransition = useCallback((callback) => {
    clearQuestTransition()
    questTransitionTimeoutRef.current = setTimeout(() => {
      questTransitionTimeoutRef.current = null
      callback()
    }, QUEST_FEEDBACK_DELAY_MS)
  }, [clearQuestTransition])

  const resetQuest = useCallback(() => {
    clearQuestTransition()
    setQuestRoundIndex(0)
    setQuestTimeLeft(QUEST_TIME_LIMITS[0])
    setQuestHoldProgress(0)
    setQuestScore(0)
    setQuestStreak(0)
    setQuestMisses(0)
    setQuestStatus('playing')
    setTutorialSkipped(false)
  }, [clearQuestTransition])

  useEffect(() => clearQuestTransition, [clearQuestTransition])

  // ── Keyboard handlers ──
  useEffect(() => {
    const held = new Set()

    const onDown = (e) => {
      if (held.has(e.key)) return
      held.add(e.key)

      // Log arrow key axis information
      if (e.key.startsWith('Arrow')) {
        console.log('%c[KEYBOARD] Key Pressed:', 'color: #ffc145; font-weight: bold', e.key)
        console.log('%c  Axis:', 'color: #58c4dc', e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 'HORIZONTAL (X-axis rotation)' : 'VERTICAL (Stop action)')
        console.log('%c  Direction:', 'color: #56e39f',
          e.key === 'ArrowLeft' ? 'LEFT (←) - Spin wheel counter-clockwise' :
            e.key === 'ArrowRight' ? 'RIGHT (→) - Spin wheel clockwise' :
              e.key === 'ArrowUp' ? 'UP (↑) - Stop immediately' : 'DOWN'
        )
      }

      switch (e.key) {
        case 'ArrowLeft':
          setSpinState('spinning-left')
          break
        case 'ArrowRight':
          setSpinState('spinning-right')
          break
        case 'ArrowUp':
          // Immediate stop — snap to nearest season
          setSpinState('stopping')
          break
        default:
          break
      }
    }

    const onUp = (e) => {
      held.delete(e.key)

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // When arrow released, if other arrow still held, keep that direction
        if (held.has('ArrowLeft')) {
          setSpinState('spinning-left')
        } else if (held.has('ArrowRight')) {
          setSpinState('spinning-right')
        } else {
          // No arrows held — let friction decelerate (idle state)
          setSpinState('idle')
        }
      }

      if (e.key === 'ArrowUp') {
        // After stopping, go idle
        // (the snap logic in SeasonWheel handles the rest)
      }
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const handleSeasonChange = useCallback((s) => {
    playSeasonChime(s)
    setSeason(s)
  }, [])
  const handleLoaded = useCallback(() => setIsLoaded(true), [])
  const toggleFreeLook = useCallback(() => {
    playClick()
    setFreeLook((v) => !v)
  }, [])

  const handleTransformEnd = useCallback((pos, rot, scale) => {
    setMasterPos(pos)
    setMasterRot(rot)
    setMasterScale(scale)
  }, [])

  // ── Balance Board handler ──
  // Tilt left/right = continuous spin (like holding arrow keys)
  // Return to center = release (friction deceleration, then snap to season)
  useEffect(() => {
    if (!isBalanceBoardConnected) return

    // Track the last direction to detect changes
    const prevDirection = lastBalanceTiltRef.current
    const currentDirection = balanceBoardDirection

    if (currentDirection === prevDirection) return
    lastBalanceTiltRef.current = currentDirection

    // Handle direction change
    if (currentDirection === 'left') {
      setSpinState('spinning-left')
      console.log('%c[App] Balance Board → Spin Left (HOLD)', 'color: #ffc145; font-weight: bold')
    } else if (currentDirection === 'right') {
      setSpinState('spinning-right')
      console.log('%c[App] Balance Board → Spin Right (HOLD)', 'color: #56e39f; font-weight: bold')
    } else if (currentDirection === 'center') {
      // Return to center = release (let friction slow it down naturally)
      setSpinState('idle')
      console.log('%c[App] Balance Board → Centered (RELEASE - friction will stop)', 'color: #58c4dc; font-weight: bold')
    }
  }, [balanceBoardDirection, isBalanceBoardConnected])

  // Spin sound effect
  useEffect(() => {
    if (spinState === 'spinning-left' || spinState === 'spinning-right') {
      playRumble()
    }
  }, [spinState])

  // Season Quest countdown
  useEffect(() => {
    if (questStatus !== 'playing') return

    const timer = setInterval(() => {
      setQuestTimeLeft((value) => Math.max(0, Number((value - QUEST_TICK_SECONDS).toFixed(1))))
    }, QUEST_TICK_MS)

    return () => clearInterval(timer)
  }, [questStatus, questRoundIndex])

  // Season Quest hold detector
  useEffect(() => {
    if (questStatus !== 'playing') return

    if (!isHoldingTarget) {
      setQuestHoldProgress(0)
      return
    }

    const timer = setInterval(() => {
      setQuestHoldProgress((value) => (
        Math.min(QUEST_HOLD_SECONDS, Number((value + QUEST_TICK_SECONDS).toFixed(1)))
      ))
    }, QUEST_TICK_MS)

    return () => clearInterval(timer)
  }, [questStatus, isHoldingTarget])

  // Season Quest round resolution
  useEffect(() => {
    if (questStatus !== 'playing') return

    if (questHoldProgress >= QUEST_HOLD_SECONDS) {
      const nextRoundIndex = questRoundIndex + 1
      setQuestStatus('success')
      setQuestHoldProgress(QUEST_HOLD_SECONDS)
      setQuestScore((value) => value + 100)
      setQuestStreak((value) => value + 1)

      scheduleQuestTransition(() => {
        if (nextRoundIndex >= questRoundCount) {
          setQuestStatus('complete')
          return
        }

        setQuestRoundIndex(nextRoundIndex)
        setQuestTimeLeft(QUEST_TIME_LIMITS[nextRoundIndex])
        setQuestHoldProgress(0)
        setQuestStatus('playing')
      })
      return
    }

    if (questTimeLeft <= 0) {
      setQuestStatus('retry')
      setQuestHoldProgress(0)
      setQuestStreak(0)
      setQuestMisses((value) => value + 1)

      scheduleQuestTransition(() => {
        setQuestTimeLeft(QUEST_TIME_LIMITS[questRoundIndex])
        setQuestStatus('playing')
      })
    }
  }, [
    questStatus,
    questHoldProgress,
    questTimeLeft,
    questRoundIndex,
    questRoundCount,
    scheduleQuestTransition,
  ])

  const seasonColor = SEASON_COLORS[season] || '#a78bfa'
  const targetSeasonColor = SEASON_COLORS[targetSeason] || '#a78bfa'

  return (
    <>
      {/* ── Setup Mode Global Toggle ── */}
      <button
        className={`btn setup-toggle-btn ${isSetupMode ? 'active' : ''}`}
        onClick={() => { playClick(); setIsSetupMode(v => !v); }}
      >
        🛠️ Setup
      </button>

      {/* ── HUD Layer ── */}
      {isSetupMode && (
        <SetupOverlay
          masterPos={masterPos}
          masterRot={masterRot}
          masterScale={masterScale}
          setMasterPos={setMasterPos}
          setMasterRot={setMasterRot}
          setMasterScale={setMasterScale}
          transformMode={transformMode}
          setTransformMode={setTransformMode}
          freeLook={freeLook}
          onToggleFreeLook={toggleFreeLook}
        />
      )}

      {/* Season Badge */}
      <div className={`season-badge glass-panel ${season}`} id="season-badge">
        <span
          className="dot"
          style={{ background: seasonColor, boxShadow: `0 0 12px ${seasonColor}` }}
        />
        <span className="season-name" style={{ color: seasonColor }}>
          {SEASON_LABELS[season] || season}
        </span>
      </div>

      {/* Season Quest mission HUD */}
      <div
        className={`quest-panel glass-panel ${questStatus} ${targetSeason}`}
        style={{ '--quest-color': targetSeasonColor }}
      >
        <div className="quest-header">
          <div>
            <div className="quest-kicker">Season Quest</div>
            <div className="quest-round">
              Round {Math.min(questRoundIndex + 1, questRoundCount)}/{questRoundCount}
            </div>
          </div>
          <div className={`quest-timer ${questTimeLeft <= 5 && questStatus === 'playing' ? 'danger' : ''}`}>
            {questStatus === 'complete' ? 'Done' : `${Math.ceil(questTimeLeft)}s`}
          </div>
        </div>

        <div className="quest-target-row">
          <span>Target</span>
          <strong>{SEASON_LABELS[targetSeason] || targetSeasonName}</strong>
        </div>

        {showQuestTutorial && (
          <div className="quest-tutorial">
            <div className="quest-tutorial-header">
              <div className="quest-tutorial-title">{questTutorial.title}</div>
              <button
                type="button"
                className="quest-tutorial-skip"
                onClick={() => setTutorialSkipped(true)}
              >
                Skip
              </button>
            </div>
            <div className="quest-tutorial-text">{liveTutorialInstruction}</div>
          </div>
        )}

        <div className="quest-message">{questFeedback}</div>

        <div className="quest-progress-track" aria-label="Target season hold progress">
          <div
            className="quest-progress-fill"
            style={{ width: `${Math.min(100, questHoldPercent)}%` }}
          />
        </div>

        <div className="quest-progress-meta">
          <span>Hold</span>
          <span>{questHoldProgress.toFixed(1)}s / {QUEST_HOLD_SECONDS.toFixed(1)}s</span>
        </div>

        <div className="quest-stats">
          <span>Score {questScore}</span>
          <span>Streak {questStreak}</span>
          <span>Misses {questMisses}</span>
        </div>

        {questStatus === 'complete' && (
          <button className="btn btn-primary quest-restart-btn" onClick={resetQuest}>
            Restart Quest
          </button>
        )}
      </div>

      {/* Controls hint */}
      <div className="controls-hint glass-panel" id="controls-hint">
        <div className="key-hint">
          <span className="key-box">←</span> Spin Left
        </div>
        <div className="key-hint">
          <span className="key-box">→</span> Spin Right
        </div>
        <div className="key-hint">
          <span className="key-box">↑</span> Stop
        </div>
      </div>

      {/* Balance Board UI */}
      <BalanceBoardUI
        isConnected={isBalanceBoardConnected}
        lastDirection={balanceBoardDirection}
        error={balanceBoardError}
        onConnect={connectBalanceBoard}
        onDisconnect={disconnectBalanceBoard}
      />

      {/* Spin state indicator */}
      {spinState !== 'idle' && (
        <div className="spin-indicator glass-panel" id="spin-indicator">
          {spinState === 'spinning-left' && '⟲ Spinning Left…'}
          {spinState === 'spinning-right' && '⟳ Spinning Right…'}
          {spinState === 'stopping' && '⏹ Stopping…'}
        </div>
      )}

      {/* ── 3D Canvas + DOM Particle Overlay ── */}
      <div className="canvas-wrapper" id="canvas-wrapper">
        {/* DOM-based weather particles — always positioned correctly over viewport */}
        <DOMParticles season={season} active={!isMoving} />
        <Canvas
          shadows
          camera={{ position: [151.75, 27.60, 17.78], fov: 45, near: 0.1, far: 2000 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
          }}
        >
          <XR>
            {/* ── Season-adaptive lighting + shadows ── */}
            <SeasonLighting season={season} />
            <TabVisibilityHandler />

            {/* Environment provides PBR reflections for physical materials without a background sky */}
            <Environment preset="park" intensity={0.6} />

            {/* Animated Sky Panorama globally lighting the environment */}
            <Suspense fallback={null}>
              <SeasonSkyPanorama activeSeason={season} spinState={spinState} isMoving={isMoving} />
            </Suspense>

            {/* Model */}
            <Suspense fallback={null}>
              <SeasonWheel
                onSeasonChange={handleSeasonChange}
                onLoaded={handleLoaded}
                onMoveChange={(moving) => setIsMoving(moving)}
                spinState={spinState}
                isMoving={isMoving}
                masterPos={masterPos}
                masterRot={masterRot}
                masterScale={masterScale}
                isSetupMode={isSetupMode}
                transformMode={transformMode}
                setOrbitEnabled={setOrbitEnabled}
                onTransformEnd={handleTransformEnd}
              />
            </Suspense>

            {/* WebXR Controllers */}
            <Controllers />

            {/* VR Thumbstick Input */}
            <VRInputHandler setSpinState={setSpinState} />

            {/* Free-look orbit controls with PAN support
                - Left mouse: rotate/orbit
                - Right mouse or Shift+Left: pan (move forward/back/left/right)
                - Scroll: zoom */}
            {/* Camera Logger — logs position/rotation on lock */}
            <CameraLogger freeLook={freeLook} />

            {/* Free-look orbit controls with PAN support
                - Left mouse: rotate/orbit
                - Right mouse or Shift+Left: pan (move forward/back/left/right)
                - Scroll: zoom */}
            {freeLook && (
              <OrbitControls
                makeDefault
                enabled={orbitEnabled}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                panSpeed={1.5}
                rotateSpeed={0.8}
                zoomSpeed={1.2}
                minDistance={5}
                maxDistance={500}
                screenSpacePanning={false}
                enableKeys={false}
                keyPanSpeed={0}
                keyRotateSpeed={0}
                keys={{
                  LEFT: '', // ArrowLeft
                  UP: '', // ArrowUp
                  RIGHT: '', // ArrowRight
                  BOTTOM: '' // ArrowDown
                }}
              />
            )}
          </XR>
        </Canvas>
      </div>

      {/* WebXR Enter VR Button */}
      <div className="vr-button-wrapper">
        <VRButton className="btn vr-btn" />
      </div>

      {/* Full-page loading fallback */}
      {!isLoaded && <LoadingScreen />}
    </>
  )
}
