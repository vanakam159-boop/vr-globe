import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * SeasonLighting — Dynamic per-season lighting & shadow configuration
 * ────────────────────────────────────────────────────────────────────
 * Each season gets its own mood via:
 *   • Directional "sun" with colour-temperature shift + shadow tuning
 *   • Hemisphere sky/ground colours
 *   • Ambient fill intensity
 *   • Accent point-light for the active quadrant
 *
 * All transitions are smoothly lerped over ~1 second.
 */

// ─── Per-season lighting presets ────────────────────────────────────
const PRESETS = {
  spring: {
    // Soft overcast daylight — warm pink-white sun, green-tinted ground bounce
    sunColor:       new THREE.Color('#fff0e8'),
    sunIntensity:   1.6,
    sunPos:         new THREE.Vector3(8, 22, 12),
    ambientIntensity: 0.55,
    hemiSky:        new THREE.Color('#e0f0ff'),
    hemiGround:     new THREE.Color('#3a6e2a'),
    hemiIntensity:  0.45,
    accentColor:    new THREE.Color('#88eeb5'),
    accentIntensity: 1.8,
    accentPos:      new THREE.Vector3(0, 14, 18),
    // Shadow
    shadowBias:     -0.0008,
    shadowRadius:   4,
    shadowNear:     1,
    shadowFar:      80,
    shadowCamSize:  50,
  },
  summer: {
    // Bright harsh midday sun — warm golden, strong shadows
    sunColor:       new THREE.Color('#fff4c0'),
    sunIntensity:   2.4,
    sunPos:         new THREE.Vector3(5, 30, 8),
    ambientIntensity: 0.45,
    hemiSky:        new THREE.Color('#fffde8'),
    hemiGround:     new THREE.Color('#c2a64e'),
    hemiIntensity:  0.35,
    accentColor:    new THREE.Color('#ffd966'),
    accentIntensity: 2.2,
    accentPos:      new THREE.Vector3(6, 16, 14),
    shadowBias:     -0.0005,
    shadowRadius:   2,
    shadowNear:     1,
    shadowFar:      90,
    shadowCamSize:  55,
  },
  autumn: {
    // Warm late-afternoon — orange-amber sun low on horizon
    sunColor:       new THREE.Color('#ffcc88'),
    sunIntensity:   1.8,
    sunPos:         new THREE.Vector3(15, 14, 10),
    ambientIntensity: 0.5,
    hemiSky:        new THREE.Color('#ffe0b2'),
    hemiGround:     new THREE.Color('#5e3210'),
    hemiIntensity:  0.4,
    accentColor:    new THREE.Color('#e87040'),
    accentIntensity: 2.0,
    accentPos:      new THREE.Vector3(-4, 12, -10),
    shadowBias:     -0.001,
    shadowRadius:   5,
    shadowNear:     1,
    shadowFar:      70,
    shadowCamSize:  50,
  },
  winter: {
    // Cool blue-white overcast — desaturated indirect light, soft diffused shadows
    sunColor:       new THREE.Color('#d4e6ff'),
    sunIntensity:   1.2,
    sunPos:         new THREE.Vector3(6, 18, 14),
    ambientIntensity: 0.7,
    hemiSky:        new THREE.Color('#c4d8f0'),
    hemiGround:     new THREE.Color('#5a6988'),
    hemiIntensity:  0.55,
    accentColor:    new THREE.Color('#80c4f0'),
    accentIntensity: 1.6,
    accentPos:      new THREE.Vector3(-6, 14, 12),
    shadowBias:     -0.0012,
    shadowRadius:   6,
    shadowNear:     1,
    shadowFar:      70,
    shadowCamSize:  48,
  },
}

// Lerp speed — higher = faster transition
const LERP_SPEED = 3.0

export default function SeasonLighting({ season = 'autumn' }) {
  const sunRef      = useRef()
  const ambientRef  = useRef()
  const hemiRef     = useRef()
  const accentRef   = useRef()

  // Mutable targets that change instantly on season switch
  const target = useMemo(() => ({
    sunColor:       PRESETS[season].sunColor.clone(),
    sunIntensity:   PRESETS[season].sunIntensity,
    sunPos:         PRESETS[season].sunPos.clone(),
    ambientIntensity: PRESETS[season].ambientIntensity,
    hemiSky:        PRESETS[season].hemiSky.clone(),
    hemiGround:     PRESETS[season].hemiGround.clone(),
    hemiIntensity:  PRESETS[season].hemiIntensity,
    accentColor:    PRESETS[season].accentColor.clone(),
    accentIntensity: PRESETS[season].accentIntensity,
    accentPos:      PRESETS[season].accentPos.clone(),
  }), [season])

  // Smooth per-frame interpolation
  useFrame((_, delta) => {
    const t = 1 - Math.exp(-LERP_SPEED * delta) // exponential ease

    // ── Directional (sun) ──
    if (sunRef.current) {
      sunRef.current.color.lerp(target.sunColor, t)
      sunRef.current.intensity = THREE.MathUtils.lerp(sunRef.current.intensity, target.sunIntensity, t)
      sunRef.current.position.lerp(target.sunPos, t)

      // Update shadow camera to match preset
      const preset = PRESETS[season]
      const cam = sunRef.current.shadow.camera
      cam.near   = preset.shadowNear
      cam.far    = preset.shadowFar
      cam.left   = -preset.shadowCamSize
      cam.right  =  preset.shadowCamSize
      cam.top    =  preset.shadowCamSize
      cam.bottom = -preset.shadowCamSize
      cam.updateProjectionMatrix()

      sunRef.current.shadow.bias   = preset.shadowBias
      sunRef.current.shadow.radius = preset.shadowRadius
    }

    // ── Ambient ──
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, target.ambientIntensity, t)
    }

    // ── Hemisphere ──
    if (hemiRef.current) {
      hemiRef.current.color.lerp(target.hemiSky, t)
      hemiRef.current.groundColor.lerp(target.hemiGround, t)
      hemiRef.current.intensity = THREE.MathUtils.lerp(hemiRef.current.intensity, target.hemiIntensity, t)
    }

    // ── Accent point light ──
    if (accentRef.current) {
      accentRef.current.color.lerp(target.accentColor, t)
      accentRef.current.intensity = THREE.MathUtils.lerp(accentRef.current.intensity, target.accentIntensity, t)
      accentRef.current.position.lerp(target.accentPos, t)
    }
  })

  // Initial values from current season preset
  const p = PRESETS[season]

  return (
    <>
      {/* ── Primary directional "sun" with shadows ── */}
      <directionalLight
        ref={sunRef}
        position={p.sunPos.toArray()}
        intensity={p.sunIntensity}
        color={p.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={p.shadowBias}
        shadow-radius={p.shadowRadius}
        shadow-camera-near={p.shadowNear}
        shadow-camera-far={p.shadowFar}
        shadow-camera-left={-p.shadowCamSize}
        shadow-camera-right={p.shadowCamSize}
        shadow-camera-top={p.shadowCamSize}
        shadow-camera-bottom={-p.shadowCamSize}
      />

      {/* ── Ambient fill ── */}
      <ambientLight ref={ambientRef} intensity={p.ambientIntensity} />

      {/* ── Hemisphere sky/ground bounce ── */}
      <hemisphereLight
        ref={hemiRef}
        intensity={p.hemiIntensity}
        color={p.hemiSky}
        groundColor={p.hemiGround}
      />

      {/* ── Season accent spotlight ── */}
      <pointLight
        ref={accentRef}
        position={p.accentPos.toArray()}
        intensity={p.accentIntensity}
        color={p.accentColor}
        distance={40}
        decay={1.5}
      />

      {/* ── Subtle purple back-fill (always-on, very dim) ── */}
      <pointLight position={[-6, 8, -4]} intensity={0.25} color="#a78bfa" />
    </>
  )
}
