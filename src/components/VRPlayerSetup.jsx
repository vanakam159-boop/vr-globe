import { useEffect, useRef } from 'react'
import { useXR } from '@react-three/xr'

/**
 * VRPlayerSetup — Spawns player at the center of the globe + Y boost + user offset
 * ─────────────────────────────────────────────────────────────────────────────
 * When entering VR, the player origin moves to the model center so they
 * stand inside the world instead of at [0,0,0].
 * The vrOffset prop lets users adjust their seated position via the menu.
 */
export default function VRPlayerSetup({ spawnPosition = [151.37, 0, 11.83], vrOffset = [0, 0, 0] }) {
  const player = useXR((state) => state.player)
  const isPresenting = useXR((state) => state.isPresenting)
  const hasSetSpawn = useRef(false)

  useEffect(() => {
    if (!isPresenting || !player || hasSetSpawn.current) return

    // Stand at center of globe, with 20% Y boost above floor + user offset
    const y = spawnPosition[1] * 1.2
    player.position.set(
      spawnPosition[0] + vrOffset[0],
      y + vrOffset[1],
      spawnPosition[2] + vrOffset[2]
    )
    player.updateMatrixWorld()

    hasSetSpawn.current = true
    console.log('%c[VR] Player spawned at center', 'color: #56e39f; font-weight: bold', {
      x: (spawnPosition[0] + vrOffset[0]).toFixed(2),
      y: (y + vrOffset[1]).toFixed(2),
      z: (spawnPosition[2] + vrOffset[2]).toFixed(2),
    })
  }, [isPresenting, player, spawnPosition, vrOffset])

  useEffect(() => {
    if (!isPresenting) hasSetSpawn.current = false
  }, [isPresenting])

  return null
}
