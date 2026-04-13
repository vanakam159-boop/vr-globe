import React, { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { playSnap } from '../audio'

/**
 * SeasonWheel — Core game component
 */

// ─── Constants ─────────────────────────────────────
const SEASON_STOPS = [
  { name: 'spring', angle: 0 },
  { name: 'summer', angle: Math.PI / 2 },
  { name: 'autumn', angle: Math.PI },
  { name: 'winter', angle: (3 * Math.PI) / 2 },
]

const MAX_SPIN_SPEED   = 20.0
const SPIN_ACCELERATION = 25.0
const WATER_WAVE_SPEED = 1.5
const FLOWER_BLOOM_SCALE = 2.0
const FLOWER_BLOOM_LERP = 0.4

// ─── Helpers ──────────────────────────────────────
function normalizeAngle(a) {
  return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
}

function findClosestSeason(angle) {
  const norm = normalizeAngle(angle)
  let closest = SEASON_STOPS[0]
  let minDist = Infinity
  for (const s of SEASON_STOPS) {
    let d = Math.abs(norm - s.angle)
    if (d > Math.PI) d = Math.PI * 2 - d
    if (d < minDist) {
      minDist = d
      closest = s
    }
  }
  return closest
}

// ─── Component ────────────────────────────────────
export default function SeasonWheel({ 
  onSeasonChange, onLoaded, spinState, onMoveChange, isMoving, 
  masterPos, masterRot, masterScale, 
  isSetupMode, transformMode, setOrbitEnabled, onTransformEnd 
}) {
  const { gl } = useThree()
  const groupRef = useRef()
  const masterWheelGroup = useRef()
  const isDraggingGizmo = useRef(false)
  const wheelRef = useRef()
  const cloudRef = useRef()

  const seasonRefs = useRef({
    spring: null,
    summer: null,
    autumn: null,
    winter: null,
  })

  const waterMaterials = useRef([])
  const flowerNodes = useRef([])
  const fishNodes = useRef([])

  const velocity = useRef(0)
  const currentAngle = useRef(3.1416)
  const lastSeason = useRef('autumn')
  const [currentSeason, setCurrentSeason] = useState('autumn')
  const snappedRef = useRef(false)

  const originalMaterials = useRef(new Map())

  const { scene, animations } = useGLTF(`${import.meta.env.BASE_URL}assests/Season Board.glb`)
  const { actions, mixer } = useAnimations(animations, groupRef)

  // ── Setup: find nodes, stash originals ──
  useEffect(() => {
    if (!scene) return

    scene.traverse((child) => {
      const name = child.name

      if (name === 'Season Board ( rotator)') {
        wheelRef.current = child
      }

      if (!wheelRef.current && name && name.includes('Season') && name.includes('Board')) {
        wheelRef.current = child
        console.warn('Fallback matched wheel rotator:', name)
      }

      if (name === 'Cloud') {
        cloudRef.current = child
      }
      
      if (name === 'Snow Flake') {
        child.visible = false
      }

      if (name === 'Spring')  seasonRefs.current.spring = child
      if (name === 'Summer')  seasonRefs.current.summer = child
      if (name === 'Autumn')  seasonRefs.current.autumn = child
      if (name === 'Snow')    seasonRefs.current.winter = child

      if (name === 'Fish_Red' || name === 'Fish_Yellow') {
        fishNodes.current.push(child)
      }

      if (name === 'Flower') {
        child.traverse((fc) => {
          if (fc.isMesh) {
            fc._origScale = fc.scale.clone()
            flowerNodes.current.push(fc)
          }
        })
      }

      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat) => {
            if (!originalMaterials.current.has(mat.uuid)) {
              originalMaterials.current.set(mat.uuid, {
                opacity: mat.opacity,
                transparent: mat.transparent,
                emissiveIntensity: mat.emissiveIntensity || 0,
                color: mat.color?.clone(),
              })
            }
          })
        }

        const matName = child.material?.name || ''
        if (
          matName.includes('Water') ||
          matName.includes('water') ||
          matName === 'Snow Water' ||
          matName === 'Spring Water' ||
          matName === 'Water.001'
        ) {
          waterMaterials.current.push({ mesh: child, material: child.material })
        }
      }
    })

    if (onLoaded) {
      onLoaded()
    }
  }, [scene, onLoaded])

  // ── Animations: play season-specific ──
  useEffect(() => {
    if (!actions) return

    const aNames = Object.keys(actions)
    console.log('Available animations:', aNames, 'Current season:', currentSeason)

    // Determine which animations should play for this season
    const toPlay = new Set()

    if (currentSeason === 'summer') {
      // ── SUMMER: NPC 3 does pushups, NPC 1 & NPC 2 dance ──
      const pushup = aNames.find((n) => n.toLowerCase().includes('pushup'))
      if (pushup) toPlay.add(pushup)

      const dance1 = aNames.find((n) => n.includes('Layer0.003'))
      if (dance1) toPlay.add(dance1)

      const dance2 = aNames.find((n) => n.includes('Layer0.001'))
      if (dance2) toPlay.add(dance2)
    } else if (currentSeason === 'autumn') {
      // ── AUTUMN: Squirrel animation + characters idle ──
      const squirrel = aNames.find((n) => n.toLowerCase().includes('squirrel'))
      if (squirrel) toPlay.add(squirrel)

      const idle = aNames.find((n) => n.toLowerCase().includes('idle'))
      if (idle) toPlay.add(idle)
    } else {
      // ── WINTER / SPRING: All characters idle ──
      const idle = aNames.find((n) => n.toLowerCase().includes('idle'))
      if (idle) toPlay.add(idle)
    }

    // Stop all animations NOT in the toPlay set, start all that ARE
    Object.entries(actions).forEach(([name, action]) => {
      if (!action) return
      if (toPlay.has(name)) {
        action.reset().setLoop(THREE.LoopRepeat).fadeIn(0.5).play()
      } else {
        action.fadeOut(0.3)
      }
    })
  }, [currentSeason, actions])

  // ── Blackout: dim non-active seasons & Hide Props ──
  useEffect(() => {
    const seasons = seasonRefs.current
    if (!seasons.spring) return

    Object.entries(seasons).forEach(([name, node]) => {
      if (!node) return
      const isActive = name === currentSeason

      // Hide Props for Unselected Seasons (keep ground visible)
      node.children.forEach(child => {
        const ln = child.name.toLowerCase()
        let isProp = false
        // Identify known props or groups (characters/animals = groups)
        if (ln.includes('pumpkin') || ln.includes('fish') || ln.includes('flower') ||
            ln.includes('boat') || ln.includes('npc') || ln.includes('sketchfab') ||
            ln.includes('squirrel') || child.type === 'Group' || child.isGroup) {
            isProp = true
        }

        // Failsafe exception: Never hide ground, water, or board
        if (ln.includes('land') || ln.includes('board') || ln.includes('cloud') || ln.includes('water') || ln.includes('snow')) {
            isProp = false
        }

        if (isProp) {
            child.visible = isActive
        } else {
            child.visible = true // Force ground meshes to remain visible
        }
      })

      node.traverse((child) => {
        if (!child.isMesh || !child.material) return
        let hasWaterMat = false
        const mats = Array.isArray(child.material) ? child.material : [child.material]

        mats.forEach((mat) => {
          const orig = originalMaterials.current.get(mat.uuid)
          if (!orig) return

          if (mat.name && mat.name.toLowerCase().includes('water')) hasWaterMat = true

          if (isActive) {
            // Restore original
            mat.opacity = orig.opacity
            mat.transparent = orig.transparent || orig.opacity < 1
            if (orig.color) mat.color.copy(orig.color)
            if (orig.emissiveIntensity !== undefined) mat.emissiveIntensity = orig.emissiveIntensity
          } else {
            // Blackout: dim like lights off without turning completely invisible
            mat.opacity = orig.opacity
            mat.transparent = orig.transparent || orig.opacity < 1
            if (orig.color && mat.color) {
              mat.color.copy(orig.color).multiplyScalar(0.55) // Just dimmed, not pitch black!
            }
            mat.emissiveIntensity = 0
          }
          mat.needsUpdate = true
        })

        // Hide water of non-active seasons so it doesn't overlap neighbors
        if (!isActive && hasWaterMat) {
           child.visible = false;
        } else if (child.name !== 'Snow Flake') {
           child.visible = true;
        }
      })
    })
  }, [currentSeason])

  // ── Imperative Prop Sync ──
  useEffect(() => {
    if (masterWheelGroup.current && !isDraggingGizmo.current) {
      masterWheelGroup.current.position.fromArray(masterPos || [0,0,0])
      if (masterRot) {
        masterWheelGroup.current.rotation.set(
          masterRot[0] * Math.PI / 180,
          masterRot[1] * Math.PI / 180,
          masterRot[2] * Math.PI / 180
        )
      }
      masterWheelGroup.current.scale.fromArray(masterScale || [1,1,1])
    }
  }, [masterPos, masterRot, masterScale])

  // ── Per-frame: spin physics, water wave, fish bob, flower bloom ──
  useFrame((state, delta) => {
    if (!wheelRef.current) return
    const clampedDelta = Math.min(delta, 0.1)
    const time = state.clock.elapsedTime

    // ── 1. Spin physics ──
    const closest = findClosestSeason(currentAngle.current)
    const target = closest.angle
    const norm = normalizeAngle(currentAngle.current)

    let diff = target - norm
    if (diff > Math.PI)  diff -= Math.PI * 2
    if (diff < -Math.PI) diff += Math.PI * 2

    if (spinState === 'spinning-left') {
      velocity.current = Math.max(velocity.current - SPIN_ACCELERATION * clampedDelta, -MAX_SPIN_SPEED)
      currentAngle.current += velocity.current * clampedDelta
    } else if (spinState === 'spinning-right') {
      velocity.current = Math.min(velocity.current + SPIN_ACCELERATION * clampedDelta, MAX_SPIN_SPEED)
      currentAngle.current += velocity.current * clampedDelta
    } else if (spinState === 'stopping') {
      if (Math.abs(diff) < 0.005) {
        currentAngle.current = target
        velocity.current = 0
      } else {
        currentAngle.current += diff * 10 * clampedDelta
        velocity.current = 0
      }
    } else {
      // 'idle' -> gradually decrease and snap exactly to center
      if (Math.abs(diff) < 0.005 && Math.abs(velocity.current) < 0.5) {
        currentAngle.current = target
        velocity.current = 0
      } else {
        const isSnappingPhase = Math.abs(velocity.current) < 1.0;
        
        if (isSnappingPhase) {
           const easeAmount = 5.0
           currentAngle.current += diff * easeAmount * clampedDelta
           velocity.current = diff * easeAmount 
           if (Math.abs(velocity.current) >= 1.0) velocity.current = Math.sign(velocity.current) * 0.99
        } else {
           velocity.current *= Math.pow(0.5, clampedDelta) 
           currentAngle.current += velocity.current * clampedDelta
        }
      }
    }

    if (velocity.current === 0) {
      if (!snappedRef.current) {
        playSnap()
        snappedRef.current = true
      }
      if (closest.name !== lastSeason.current) {
        lastSeason.current = closest.name
        setCurrentSeason(closest.name)
        onSeasonChange?.(closest.name)
      }
    } else {
      snappedRef.current = false
    }

    // Rotate only the wheel node, NOT the cloud
    wheelRef.current.rotation.y = currentAngle.current

    // ── Keep cloud fixed (counter-rotate) ──
    if (cloudRef.current && cloudRef.current.parent === wheelRef.current) {
      cloudRef.current.rotation.y = -currentAngle.current
    }

    // ── 2. Water animation ──
    const isPerfectlyStopped = Math.abs(velocity.current) < 0.001

    waterMaterials.current.forEach(({ mesh, material }) => {
      const matName = material?.name || ''
      if (mesh._origY === undefined) mesh._origY = mesh.position.y
      if (mesh._origX === undefined) mesh._origX = mesh.position.x
      if (mesh._origZ === undefined) mesh._origZ = mesh.position.z

      // Force water visibility for the active season (blackout useEffect may have hidden it)
      const isSummerWater = (matName === 'Water.001' || matName.includes('Water')) && matName !== 'Spring Water' && matName !== 'Snow Water'
      const isSpringWater = matName === 'Spring Water'
      const isSnowWater = matName === 'Snow Water'
      
      if (currentSeason === 'summer' && (isSummerWater || isSnowWater)) {
        mesh.visible = true
      } else if (currentSeason === 'spring' && isSpringWater) {
        mesh.visible = true
      } else if (currentSeason === 'winter' && isSnowWater) {
        mesh.visible = true
      }

      if (isPerfectlyStopped) {
        if (currentSeason === 'summer' && (isSummerWater || matName.includes('Water'))) {
          // ── SUMMER BEACH WAVES: dramatic push-pull movement ──
          const wavePhase = time * WATER_WAVE_SPEED
          // Main wave: push forward then pull back (beach-like) — BIG amplitude
          const beachWave = Math.sin(wavePhase) * 1.2
          // Secondary ripple for realism
          const ripple = Math.sin(wavePhase * 2.3) * 0.3
          // Tertiary short-period chop
          const chop = Math.sin(wavePhase * 4.1 + 0.7) * 0.1
          
          mesh.position.z = mesh._origZ + beachWave + ripple + chop
          // Vertical bob — waves rise and fall
          mesh.position.y = mesh._origY + Math.abs(Math.sin(wavePhase * 1.2)) * 0.4 + Math.sin(wavePhase * 0.7) * 0.15
          // Lateral sway — water slides side to side
          mesh.position.x = mesh._origX + Math.sin(wavePhase * 0.6) * 0.3
        } else if (currentSeason === 'spring' && isSpringWater) {
          // ── SPRING WATER: gentle flowing ripple ──
          mesh.position.y = mesh._origY + Math.sin(time * WATER_WAVE_SPEED) * 0.15
          mesh.position.x = mesh._origX + Math.sin(time * WATER_WAVE_SPEED * 0.7) * 0.08
          mesh.position.z = mesh._origZ + Math.sin(time * WATER_WAVE_SPEED * 0.5) * 0.06
        }
        
        // UV offset for flowing effect
        if (material.map && (currentSeason === 'summer' || currentSeason === 'spring')) {
          material.map.offset.x = Math.sin(time * 0.3) * 0.03
          material.map.offset.y = time * 0.015
        }
      } else {
        // Smoothly return to original position when spinning
        mesh.position.lerp(new THREE.Vector3(mesh._origX, mesh._origY, mesh._origZ), clampedDelta * 2)
      }
    })

    // ── 3. Fish animation (spring only) ──
    fishNodes.current.forEach((fish, i) => {
      if (fish._origY === undefined) fish._origY = fish.position.y
      if (fish._origX === undefined) fish._origX = fish.position.x
      if (fish._origZ === undefined) fish._origZ = fish.position.z

      // Force fish visibility when spring is active
      if (currentSeason === 'spring') {
        fish.visible = true
        if (fish.parent) fish.parent.visible = true
      }

      if (isPerfectlyStopped && currentSeason === 'spring') {
        // Fish jump out of water and dive back
        const jumpPhase = time * 1.8 + i * Math.PI * 0.7
        const jumpHeight = Math.max(0, Math.sin(jumpPhase)) * 0.4
        
        fish.position.y = fish._origY + jumpHeight
        // Fish sway side to side
        fish.position.x = fish._origX + Math.sin(time * 1.2 + i * 2.5) * 0.12
        // Tilt fish as they jump
        fish.rotation.z = Math.sin(jumpPhase) * 0.15
        fish.rotation.x = Math.cos(jumpPhase) * 0.08
      } else {
        fish.position.y = THREE.MathUtils.lerp(fish.position.y, fish._origY, clampedDelta * 3)
        fish.position.x = THREE.MathUtils.lerp(fish.position.x, fish._origX, clampedDelta * 3)
        fish.rotation.z = THREE.MathUtils.lerp(fish.rotation.z, 0, clampedDelta * 3)
        fish.rotation.x = THREE.MathUtils.lerp(fish.rotation.x, 0, clampedDelta * 3)
      }
    })

    // ── 4. Flower bloom animation (spring) ──
    flowerNodes.current.forEach((mesh) => {
      if (!mesh._origScale) return;
      const isStoppedSpring = (currentSeason === 'spring' && isPerfectlyStopped);
      const targetScale = isStoppedSpring ? FLOWER_BLOOM_SCALE : 0.001; 
      // Use a slow lerp for gradual blooming effect from 0
      mesh.scale.lerp(
        mesh._origScale.clone().multiplyScalar(targetScale), 
        clampedDelta * FLOWER_BLOOM_LERP
      );
    })

    // Notify App if movement state changed
    if (isPerfectlyStopped !== wheelRef.current._wasStopped) {
      wheelRef.current._wasStopped = isPerfectlyStopped
      onMoveChange?.(!isPerfectlyStopped)
    }

    // ── 5. Animation mixer ──
    // Pause animations gracefully when spinning, activate perfectly when locked!
    if (mixer) {
      mixer.timeScale = isPerfectlyStopped ? 1.0 : 0.0;
    }
  })

  return (
    <group ref={groupRef} dispose={null}>
      <group ref={masterWheelGroup}>
        <primitive object={scene} scale={1} />
        {/* Seasonal particle effects are now handled by DOMParticles overlay
            in App.jsx for reliable viewport-space positioning */}
      </group>
      
      {isSetupMode && (
        <TransformControls
          object={masterWheelGroup}
          mode={transformMode}
          onDraggingChanged={(e) => {
            isDraggingGizmo.current = e.value
            // Disable camera orbit while dragging the gizmo
            if (setOrbitEnabled) setOrbitEnabled(!e.value)
            
            // Once dragging finishes, push the new transform back to UI state
            if (!e.value && masterWheelGroup.current && onTransformEnd) {
              const g = masterWheelGroup.current
              onTransformEnd(
                g.position.toArray(),
                [
                  THREE.MathUtils.radToDeg(g.rotation.x),
                  THREE.MathUtils.radToDeg(g.rotation.y),
                  THREE.MathUtils.radToDeg(g.rotation.z)
                ],
                g.scale.toArray()
              )
            }
          }}
        />
      )}
    </group>
  )
}

useGLTF.preload(`${import.meta.env.BASE_URL}assests/Season Board.glb`)
