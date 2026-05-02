import React, { useState, useCallback, useEffect, Suspense, useRef } from 'react'
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment, Sky } from '@react-three/drei'
import { XR, Controllers, VRButton, TeleportationPlane, useXR } from '@react-three/xr'
import SeasonLighting from './components/SeasonLighting'
import * as THREE from 'three'

/**
 * CameraTracker — Continuously tracks camera position/rotation/fov for the menu
 */
function CameraTracker({ cameraDataRef }) {
  const { camera } = useThree()
  useFrame(() => {
    if (cameraDataRef.current) {
      cameraDataRef.current = {
        position: camera.position.toArray().map((v) => Number(v.toFixed(4))),
        rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z].map((v) =>
          Number(v.toFixed(4))
        ),
        fov: camera.fov,
      }
    }
  })
  return null
}

/**
 * VRPreviewCamera — Forces the non-VR camera to the VR spawn view for preview
 */
function VRPreviewCamera({ vrOffset, vrRotOffset }) {
  const { camera } = useThree()
  const defaultSpawn = [151.37, 0, 11.83]

  useFrame(() => {
    const x = defaultSpawn[0] + vrOffset[0]
    const y = defaultSpawn[1] + vrOffset[1]
    const z = defaultSpawn[2] + vrOffset[2]
    camera.position.set(x, y, z)
    camera.rotation.set(vrRotOffset[0], vrRotOffset[1], vrRotOffset[2])
    camera.updateProjectionMatrix()
  })

  return null
}

/**
 * VRPositionTracker — Tracks headset position when in XR session
 */
function VRPositionTracker({ vrCameraDataRef }) {
  const { camera } = useThree()
  const isPresenting = useXR((state) => state.isPresenting)

  useFrame(() => {
    if (isPresenting && vrCameraDataRef.current) {
      vrCameraDataRef.current = {
        position: camera.position.toArray().map((v) => Number(v.toFixed(4))),
        rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z].map((v) =>
          Number(v.toFixed(4))
        ),
        fov: camera.fov,
        isPresenting: true,
      }
    } else if (vrCameraDataRef.current) {
      vrCameraDataRef.current.isPresenting = false
    }
  })
  return null
}

/**
 * CameraLogger — Logs exact camera position & angles when Free Look is locked
 * Place this inside the <Canvas> so it can access useThree().
 */
/**
 * VRInputHandler — Maps VR controller thumbstick to wheel spin
 */
function VRInputHandler({ setSpinState }) {
  const { gl, camera } = useThree()
  const vrControllingRef = useRef(false)
  const controllers = useXR((state) => state.controllers)
  const player = useXR((state) => state.player)

  useFrame((_, delta) => {
    const session = gl.xr.getSession?.()
    if (!session) {
      if (vrControllingRef.current) {
        vrControllingRef.current = false
        setSpinState('idle')
      }
      return
    }

    let direction = 'center'
    const gamepads = []

    // ── Collect all controller gamepads ──
    for (const inputSource of session.inputSources || []) {
      if (inputSource.gamepad && inputSource.gamepad.axes.length >= 2) {
        gamepads.push(inputSource.gamepad)
      }
    }

    // ── Vertical flight: both joysticks up/down ──
    if (gamepads.length >= 2 && player) {
      const y1 = gamepads[0].axes[1] || 0
      const y2 = gamepads[1].axes[1] || 0
      const FLY_THRESHOLD = 0.5
      const FLY_SPEED = 18.0 // units per second

      // Both pushed UP (gamepad Y is -1 at top)
      if (y1 < -FLY_THRESHOLD && y2 < -FLY_THRESHOLD) {
        player.position.y += FLY_SPEED * delta
        player.updateMatrixWorld()
      }
      // Both pushed DOWN (gamepad Y is +1 at bottom)
      else if (y1 > FLY_THRESHOLD && y2 > FLY_THRESHOLD) {
        player.position.y -= FLY_SPEED * delta
        player.updateMatrixWorld()
      }
    }

    // ── Horizontal spin: thumbstick X axes ──
    for (const gp of gamepads) {
      const x = gp.axes[0] || 0
      if (x < -0.4) {
        direction = 'left'
        break
      } else if (x > 0.4) {
        direction = 'right'
        break
      }
    }

    // ── Fallback: right controller position relative to headset ──
    if (direction === 'center' && controllers.length >= 2) {
      const rightController = controllers.find((c) => c.inputSource?.handedness === 'right')
      if (rightController) {
        const headX = camera.position.x
        const handX = rightController.position.x
        const offset = handX - headX
        const DEADZONE = 0.15
        if (offset < -DEADZONE) {
          direction = 'left'
        } else if (offset > DEADZONE) {
          direction = 'right'
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
import DOMParticles from './components/DOMParticles'
import VRPlayerSetup from './components/VRPlayerSetup'
import GameMenu from './components/GameMenu'
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

  // Menu & VR offset states
  const [menuOpen, setMenuOpen] = useState(false)
  const [vrOffset, setVrOffset] = useState([0, 0, 0])
  const [vrRotOffset, setVrRotOffset] = useState([0, 0, 0])
  const [vrPreview, setVrPreview] = useState(false)

  // Ref for camera data (updated by CameraTracker inside Canvas)
  const cameraDataRef = useRef({
    position: [151.75, 27.60, 17.78],
    rotation: [0, 0, 0],
    fov: 45,
  })

  // Ref for VR headset data (updated by VRPositionTracker inside Canvas)
  const vrCameraDataRef = useRef({
    position: [151.37, 0, 11.83],
    rotation: [0, 0, 0],
    fov: 45,
    isPresenting: false,
  })

  const handleSeasonChange = useCallback((s) => {
    playSeasonChime(s)
    setSeason(s)
  }, [])
  const handleLoaded = useCallback(() => setIsLoaded(true), [])
  const toggleFreeLook = useCallback(() => {
    playClick()
    setFreeLook((v) => !v)
  }, [])

  // Toggle free look with 'F' key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFreeLook()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFreeLook])

  const handleTransformEnd = useCallback((pos, rot, scale) => {
    setMasterPos(pos)
    setMasterRot(rot)
    setMasterScale(scale)
  }, [])

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

  // Spin sound effect
  useEffect(() => {
    if (spinState === 'spinning-left' || spinState === 'spinning-right') {
      playRumble()
    }
  }, [spinState])

  const seasonColor = SEASON_COLORS[season] || '#a78bfa'

  return (
    <>
      {/* ── Game Menu ── */}
      <GameMenu
        isOpen={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        cameraDataRef={cameraDataRef}
        vrCameraDataRef={vrCameraDataRef}
        masterPos={masterPos}
        masterRot={masterRot}
        masterScale={masterScale}
        vrOffset={vrOffset}
        setVrOffset={setVrOffset}
        vrRotOffset={vrRotOffset}
        setVrRotOffset={setVrRotOffset}
        vrPreview={vrPreview}
        setVrPreview={setVrPreview}
        freeLook={freeLook}
        setFreeLook={setFreeLook}
      />

      {/* ── Setup Mode Global Toggle ── */}
      <button
        className={`btn setup-toggle-btn ${isSetupMode ? 'active' : ''}`}
        onClick={() => { playClick(); setIsSetupMode(v => !v); }}
      >
        🛠️ Setup
      </button>

      {/* ── Free Look Toggle (always visible) ── */}
      <button
        className={`btn freelook-toggle-btn ${freeLook ? 'active' : ''} ${vrPreview ? 'disabled' : ''}`}
        onClick={() => { if (!vrPreview) toggleFreeLook() }}
        title={vrPreview ? 'Disabled during VR Preview' : 'Press F to toggle'}
      >
        {vrPreview ? '👁️ VR Preview Active' : freeLook ? '🎥 Free Look' : '🔒 Locked'}
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
        <div className="key-hint">
          <span className="key-box">F</span> Free Look
        </div>
      </div>

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

            {/* VR Player spawn position + offset */}
            <VRPlayerSetup spawnPosition={[151.37, 0, 11.83]} vrOffset={vrOffset} vrRotOffset={vrRotOffset} />

            {/* Teleportation — both controllers, ground plane at model base */}
            <TeleportationPlane
              position={[151.37, 0.01, 11.83]}
              leftHand
              rightHand
              maxDistance={80}
              size={0.4}
            />

            {/* Camera Tracker — keeps ref updated for menu copy */}
            <CameraTracker cameraDataRef={cameraDataRef} />

            {/* VR Position Tracker — captures headset position in VR */}
            <VRPositionTracker vrCameraDataRef={vrCameraDataRef} />

            {/* Camera Logger — logs position/rotation on lock */}
            <CameraLogger freeLook={freeLook} />

            {/* VR Preview Camera — overrides the normal camera to show VR spawn view */}
            {vrPreview && (
              <VRPreviewCamera vrOffset={vrOffset} vrRotOffset={vrRotOffset} />
            )}

            {/* Free-look orbit controls with PAN support
                - Left mouse: rotate/orbit
                - Right mouse or Shift+Left: pan (move forward/back/left/right)
                - Scroll: zoom */}
            {freeLook && !vrPreview && (
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
