import React, { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import snowflakeImg from '../../assests/snowflake.png'
import autumnImg from '../../assests/autumn.png'

// ─── Particle spatial config ──────────────────────────
// These radii match the Season Board model: the Land meshes extend ~130 units
// from the rotator center. Particles spawn in polar wedges over each sector.
const MIN_RADIUS = 30.0;
const MAX_RADIUS = 135.0;
const SKY_HEIGHT = 45.0;
const FLOOR_Y = 10.0;

/**
 * Spawn a particle within a polar wedge (pie-slice) defined by angle range
 * and radial range. Math.sqrt on radius ensures even area distribution.
 */
const spawnInSlice = (minAngle, maxAngle) => {
  const theta = minAngle + Math.random() * (maxAngle - minAngle);
  const r = MIN_RADIUS + Math.sqrt(Math.random()) * (MAX_RADIUS - MIN_RADIUS);
  return {
    x: Math.cos(theta) * r,
    y: SKY_HEIGHT + Math.random() * 15.0,
    z: Math.sin(theta) * r
  };
};

const WINTER_COUNT = 600
const AUTUMN_COUNT = 300
const SPRING_COUNT = 800
const SUMMER_COUNT = 150

// ═══════════════════════════════════════════════════════
// ─── Winter Snowstorm ─────────────────────────────────
// ═══════════════════════════════════════════════════════
function WinterSnow({ active, minAngle, maxAngle }) {
  const ref = useRef()
  const texture = useLoader(THREE.TextureLoader, snowflakeImg)

  const { particleData, positions } = useMemo(() => {
    const data = []
    const pos = new Float32Array(WINTER_COUNT * 3)

    for (let i = 0; i < WINTER_COUNT; i++) {
      const pt = spawnInSlice(minAngle, maxAngle)
      data.push({
        origX: pt.x, origZ: pt.z, y: pt.y,
        vy: -2.5 - Math.random() * 3.5,
        windFreq: 0.5 + Math.random() * 1.5,
        swayPhase: Math.random() * Math.PI * 2,
      })
      pos[i*3] = pt.x; pos[i*3+1] = pt.y; pos[i*3+2] = pt.z;
    }
    return { particleData: data, positions: pos }
  }, [minAngle, maxAngle])

  useFrame((state, delta) => {
    if (!ref.current || !active) return
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime
    const arr = ref.current.geometry.attributes.position.array

    for (let i = 0; i < WINTER_COUNT; i++) {
      const d = particleData[i]
      
      d.vy -= 9.8 * 0.5 * dt
      if (d.vy < -8.0) d.vy = -8.0 
      
      d.y += d.vy * dt

      if (d.y < FLOOR_Y) {
        const pt = spawnInSlice(minAngle, maxAngle)
        d.origX = pt.x
        d.origZ = pt.z
        d.y = pt.y
        d.vy = 0
      }

      const swayX = Math.sin(time * d.windFreq + d.swayPhase) * 1.5
      const swayZ = Math.cos(time * d.windFreq + d.swayPhase) * 1.5

      arr[i * 3]     = d.origX + swayX
      arr[i * 3 + 1] = d.y
      arr[i * 3 + 2] = d.origZ + swayZ
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={WINTER_COUNT} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={8.0}
        transparent
        depthWrite={false}
        sizeAttenuation={false}
        color="#ffffff"
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ═══════════════════════════════════════════════════════
// ─── Autumn Falling Leaves ────────────────────────────
// ═══════════════════════════════════════════════════════
function AutumnLeaves({ active, minAngle, maxAngle }) {
  const ref = useRef()
  const texture = useLoader(THREE.TextureLoader, autumnImg)

  const { particleData, positions, colors } = useMemo(() => {
    const data = []
    const pos = new Float32Array(AUTUMN_COUNT * 3)
    const cols = new Float32Array(AUTUMN_COUNT * 3)
    
    const colorPalette = [
      new THREE.Color('#e8713a'),
      new THREE.Color('#d94824'),
      new THREE.Color('#a82e16'),
      new THREE.Color('#ff5522'),
      new THREE.Color('#cca122'),
    ]

    for (let i = 0; i < AUTUMN_COUNT; i++) {
      const pt = spawnInSlice(minAngle, maxAngle)
      data.push({
        origX: pt.x, origZ: pt.z, y: pt.y,
        vy: 0,
        swayFreq: 0.3 + Math.random() * 0.6,
        swayPhase: Math.random() * Math.PI * 2,
      })
      pos[i*3] = pt.x; pos[i*3+1] = pt.y; pos[i*3+2] = pt.z;

      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      cols[i*3] = col.r; cols[i*3+1] = col.g; cols[i*3+2] = col.b;
    }
    return { particleData: data, positions: pos, colors: cols }
  }, [minAngle, maxAngle])

  useFrame((state, delta) => {
    if (!ref.current || !active) return
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime
    const arr = ref.current.geometry.attributes.position.array

    for (let i = 0; i < AUTUMN_COUNT; i++) {
      const d = particleData[i]
      
      d.vy -= 9.8 * 0.4 * dt
      if (d.vy < -5.0) d.vy = -5.0 
      
      d.y += d.vy * dt

      if (d.y < FLOOR_Y) {
        const pt = spawnInSlice(minAngle, maxAngle)
        d.origX = pt.x
        d.origZ = pt.z
        d.y = pt.y
        d.vy = 0
      }

      const swayX = Math.sin(time * d.swayFreq + d.swayPhase) * 2.5
      const swayZ = Math.cos(time * d.swayFreq * 0.8 + d.swayPhase) * 2.0

      arr[i * 3]     = d.origX + swayX
      arr[i * 3 + 1] = d.y
      arr[i * 3 + 2] = d.origZ + swayZ
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={AUTUMN_COUNT} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={AUTUMN_COUNT} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={6.0}
        transparent
        alphaTest={0.05}
        depthWrite={false}
        sizeAttenuation={false}
        vertexColors={true}
        opacity={0.95}
      />
    </points>
  )
}

// ═══════════════════════════════════════════════════════
// ─── Spring Raindrops ─────────────────────────────────
// ═══════════════════════════════════════════════════════
function SpringRain({ active, minAngle, maxAngle }) {
  const ref = useRef()

  const { particleData, positions } = useMemo(() => {
    const data = []
    const pos = new Float32Array(SPRING_COUNT * 3)

    for (let i = 0; i < SPRING_COUNT; i++) {
      const pt = spawnInSlice(minAngle, maxAngle)
      data.push({
        origX: pt.x, origZ: pt.z, y: pt.y,
        vy: -15.0 - Math.random() * 10.0,
      })
      pos[i*3] = pt.x; pos[i*3+1] = pt.y; pos[i*3+2] = pt.z;
    }
    return { particleData: data, positions: pos }
  }, [minAngle, maxAngle])

  useFrame((state, delta) => {
    if (!ref.current || !active) return
    const dt = Math.min(delta, 0.05)
    const arr = ref.current.geometry.attributes.position.array

    for (let i = 0; i < SPRING_COUNT; i++) {
      const d = particleData[i]
      
      d.vy -= 9.8 * 2.0 * dt
      if (d.vy < -25.0) d.vy = -25.0
      
      d.y += d.vy * dt

      if (d.y < FLOOR_Y) {
        const pt = spawnInSlice(minAngle, maxAngle)
        d.origX = pt.x
        d.origZ = pt.z
        d.y = pt.y
        d.vy = -15.0
      }

      arr[i * 3]     = d.origX
      arr[i * 3 + 1] = d.y
      arr[i * 3 + 2] = d.origZ
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={SPRING_COUNT} />
      </bufferGeometry>
      <pointsMaterial size={1.2} transparent depthWrite={false} color="#88ccff" opacity={0.7} blending={THREE.AdditiveBlending} sizeAttenuation={false} />
    </points>
  )
}

// ═══════════════════════════════════════════════════════
// ─── Summer Sparkles ──────────────────────────────────
// ═══════════════════════════════════════════════════════
function SummerSparkles({ active, minAngle, maxAngle }) {
  const ref = useRef()

  const { particleData, positions } = useMemo(() => {
    const data = []
    const pos = new Float32Array(SUMMER_COUNT * 3)

    for (let i = 0; i < SUMMER_COUNT; i++) {
      const pt = spawnInSlice(minAngle, maxAngle)
      data.push({
        origX: pt.x, origZ: pt.z, y: pt.y,
        floatFreq: 0.5 + Math.random() * 0.8,
        floatAmp: 2.0 + Math.random() * 3.0,
        phase: Math.random() * Math.PI * 2,
      })
      pos[i*3] = pt.x; pos[i*3+1] = pt.y; pos[i*3+2] = pt.z;
    }
    return { particleData: data, positions: pos }
  }, [minAngle, maxAngle])

  useFrame((state) => {
    if (!ref.current || !active) return
    const time = state.clock.elapsedTime
    const arr = ref.current.geometry.attributes.position.array

    for (let i = 0; i < SUMMER_COUNT; i++) {
      const d = particleData[i]
      arr[i * 3]     = d.origX + Math.sin(time + d.phase) * d.floatAmp
      arr[i * 3 + 1] = d.y + Math.sin(time * d.floatFreq + d.phase) * d.floatAmp
      arr[i * 3 + 2] = d.origZ + Math.cos(time + d.phase) * d.floatAmp
    }
    ref.current.geometry.attributes.position.needsUpdate = true

    if (ref.current.material) ref.current.material.opacity = 0.45 + Math.sin(time * 3) * 0.25
  })

  if (!active) return null

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={SUMMER_COUNT} />
      </bufferGeometry>
      <pointsMaterial size={2.0} transparent depthWrite={false} color="#ffdd77" opacity={0.8} blending={THREE.AdditiveBlending} sizeAttenuation={false} />
    </points>
  )
}

export { WinterSnow, AutumnLeaves, SpringRain, SummerSparkles }
