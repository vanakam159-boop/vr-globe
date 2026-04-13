import { useEffect } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'

/**
 * Temporary debug component — logs all node names and animation clip names
 * from the Season Board GLB so we can wire up season-specific logic.
 */
export default function ModelDebug() {
  const { scene, animations } = useGLTF(`${import.meta.env.BASE_URL}assests/Season Board.glb`)

  useEffect(() => {
    // Log all node names
    const nodes = []
    scene.traverse((child) => {
      nodes.push({
        name: child.name,
        type: child.type,
        isMesh: child.isMesh || false,
      })
    })
    console.log('=== MODEL NODES ===')
    console.log(JSON.stringify(nodes, null, 2))

    // Log all animation names
    console.log('=== ANIMATIONS ===')
    const animNames = animations.map((a) => a.name)
    console.log(JSON.stringify(animNames, null, 2))
  }, [scene, animations])

  return null
}
