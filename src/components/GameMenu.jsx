import React, { useState, useCallback } from 'react'

/**
 * GameMenu — In-game menu overlay
 * ─────────────────────────────────
 * Provides:
 *   • Free World status
 *   • Lap VR Setup (adjust VR spawn offset + capture from camera/VR)
 *   • Copy Values (camera + model transform + VR offset to clipboard)
 */

const DEFAULT_VR_SPAWN = [151.37, 0, 11.83]

export default function GameMenu({
  isOpen,
  onToggle,
  cameraDataRef,
  vrCameraDataRef,
  masterPos,
  masterRot,
  masterScale,
  vrOffset,
  setVrOffset,
  freeLook,
  setFreeLook,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    const cam = cameraDataRef?.current || {}
    const vrCam = vrCameraDataRef?.current || {}
    const inVR = vrCam.isPresenting

    let text = `// Camera (Non-VR)\nposition: [${cam.position?.map((v) => Number(v).toFixed(2)).join(', ')}]\nrotation: [${cam.rotation?.map((v) => Number(v).toFixed(4)).join(', ')}]\nfov: ${cam.fov || 45}\n\n// Model Transform\nmasterPos: [${masterPos.map((v) => Number(v).toFixed(2)).join(', ')}]\nmasterRot: [${masterRot.map((v) => Number(v).toFixed(2)).join(', ')}]\nmasterScale: [${masterScale.map((v) => Number(v).toFixed(2)).join(', ')}]\n\n// VR Offset\nvrOffset: [${vrOffset.map((v) => Number(v).toFixed(2)).join(', ')}]`

    if (inVR) {
      text += `\n\n// VR Headset Position (Live)\nvrPosition: [${vrCam.position?.map((v) => Number(v).toFixed(2)).join(', ')}]\nvrRotation: [${vrCam.rotation?.map((v) => Number(v).toFixed(4)).join(', ')}]`
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [cameraDataRef, vrCameraDataRef, masterPos, masterRot, masterScale, vrOffset])

  const changeOffset = (index, delta) => {
    setVrOffset((prev) => {
      const next = [...prev]
      next[index] = Number((next[index] + delta).toFixed(2))
      return next
    })
  }

  const resetOffset = () => setVrOffset([0, 0, 0])

  const useCameraAsVRSpawn = () => {
    const cam = cameraDataRef?.current
    if (!cam?.position) return
    const [cx, cy, cz] = cam.position
    const [sx, sy, sz] = DEFAULT_VR_SPAWN
    // Offset = camera position - default spawn position
    setVrOffset([
      Number((cx - sx).toFixed(2)),
      Number((cy - sy).toFixed(2)),
      Number((cz - sz).toFixed(2)),
    ])
  }

  const captureVRPosition = () => {
    const vrCam = vrCameraDataRef?.current
    if (!vrCam?.position || !vrCam.isPresenting) return
    const [vx, vy, vz] = vrCam.position
    const [sx, sy, sz] = DEFAULT_VR_SPAWN
    // Offset = current headset position - default spawn position
    setVrOffset([
      Number((vx - sx).toFixed(2)),
      Number((vy - sy).toFixed(2)),
      Number((vz - sz).toFixed(2)),
    ])
  }

  const isInVR = vrCameraDataRef?.current?.isPresenting || false

  return (
    <>
      {/* Menu Toggle Button */}
      <button
        className={`btn game-menu-btn ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        title="Open Menu"
      >
        {isOpen ? '✕ Close' : '☰ Menu'}
      </button>

      {/* Menu Panel */}
      {isOpen && (
        <div className="game-menu-panel glass-panel">
          <h2 className="game-menu-title">🎮 Game Menu</h2>

          {/* Free World Section */}
          <div className="game-menu-section">
            <div className="game-menu-section-header">🌍 Free World</div>
            <div className="game-menu-row">
              <span className="game-menu-status active">Active</span>
              <button
                className={`btn btn-ghost ${freeLook ? 'active' : ''}`}
                onClick={() => setFreeLook((v) => !v)}
              >
                {freeLook ? '🔓 Free Look ON' : '🔒 Camera Locked'}
              </button>
            </div>
            <p className="game-menu-hint">
              Explore freely. Use arrow keys or VR thumbsticks to spin the wheel.
            </p>
          </div>

          {/* Lap VR Setup Section */}
          <div className="game-menu-section">
            <div className="game-menu-section-header">🥽 Lap VR Setup</div>
            <p className="game-menu-hint">
              Adjust your VR spawn offset before entering VR.
            </p>

            {['X', 'Y', 'Z'].map((axis, i) => (
              <div className="game-menu-input-row" key={axis}>
                <span className="game-menu-axis-label">{axis}</span>
                <button
                  className="btn btn-ghost btn-step"
                  onClick={() => changeOffset(i, -0.5)}
                >
                  −
                </button>
                <span className="game-menu-axis-value">
                  {vrOffset[i].toFixed(2)}
                </span>
                <button
                  className="btn btn-ghost btn-step"
                  onClick={() => changeOffset(i, 0.5)}
                >
                  +
                </button>
              </div>
            ))}

            <div className="game-menu-row" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={resetOffset}>
                ↺ Reset Offset
              </button>
            </div>

            {!isInVR && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 8, width: '100%' }}
                onClick={useCameraAsVRSpawn}
              >
                📷 Use Camera as VR Spawn
              </button>
            )}
            {!isInVR && (
              <p className="game-menu-hint">
                Move the camera to where you want to stand in VR, then click above.
              </p>
            )}

            {isInVR && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 8, width: '100%' }}
                onClick={captureVRPosition}
              >
                🥽 Capture Current VR Position
              </button>
            )}
            {isInVR && (
              <p className="game-menu-hint">
                Stand where you want to spawn, then click to save this position.
              </p>
            )}
          </div>

          {/* Copy Values Section */}
          <div className="game-menu-section">
            <div className="game-menu-section-header">📋 Copy Values</div>
            <p className="game-menu-hint">
              Copy current camera, model, and VR offset values to clipboard.
            </p>
            <button className="btn btn-primary game-menu-copy-btn" onClick={handleCopy}>
              {copied ? '✓ Copied!' : '📄 Copy to Clipboard'}
            </button>
          </div>

          {/* Close */}
          <div className="game-menu-footer">
            <button className="btn btn-ghost game-menu-close-btn" onClick={onToggle}>
              Close Menu
            </button>
          </div>
        </div>
      )}
    </>
  )
}
