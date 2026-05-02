import { useEffect, useRef } from 'react'
import { useXR } from '@react-three/xr'

/**
 * VRPlayerSetup — Spawns player at the center of the globe + user offset + rotation
 * ──────────────────────────────────────────────────────────────────────────────
 * When entering VR, the player origin moves to the model center so they
 * stand inside the world instead of at [0,0,0].
 * The vrOffset/vrRotOffset props let users adjust their position and view direction.
 */
export default function VRPlayerSetup({ spawnPosition = [151.37, 0, 11.83], vrOffset = [0, 0, 0], vrRotOffset = [0, 0, 0] }) {
  const player = useXR((state) => state.player)
  const isPresenting = useXR((state) => state.isPresenting)
  const hasSetSpawn = useRef(false)

  useEffect(() => {
    if (!isPresenting || !player || hasSetSpawn.current) return

    // Position: default spawn + user offset
    const y = spawnPosition[1]
    player.position.set(
      spawnPosition[0] + vrOffset[0],
      y + vrOffset[1],
      spawnPosition[2] + vrOffset[2]
    )

    // Rotation: apply user rotation offset (radians)
    player.rotation.set(vrRotOffset[0], vrRotOffset[1], vrRotOffset[2])
    player.updateMatrixWorld()

    hasSetSpawn.current = true
    console.log('%c[VR] Player spawned', 'color: #56e39f; font-weight: bold', {
      pos: [
        (spawnPosition[0] + vrOffset[0]).toFixed(2),
        (y + vrOffset[1]).toFixed(2),
        (spawnPosition[2] + vrOffset[2]).toFixed(2),
      ],
      rot: vrRotOffset.map((r) => r.toFixed(4)),
    })
  }, [isPresenting, player, spawnPosition, vrOffset, vrRotOffset])

  useEffect(() => {
    if (!isPresenting) hasSetSpawn.current = false
  }, [isPresenting])

  return null
}
