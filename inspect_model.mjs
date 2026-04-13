import { readFileSync } from 'fs'

// Minimal GLB parser to extract node names and animation names
const buffer = readFileSync('./assests/Season Board.glb')
const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

// GLB header: magic(4) + version(4) + length(4)
const magic = dataView.getUint32(0, true)
console.log('Magic:', magic.toString(16)) // should be 0x46546C67

// First chunk (JSON)
const chunk0Length = dataView.getUint32(12, true)
const chunk0Type = dataView.getUint32(16, true)
console.log('JSON chunk length:', chunk0Length)

const jsonStr = buffer.slice(20, 20 + chunk0Length).toString('utf8')
const gltf = JSON.parse(jsonStr)

// Print node names
console.log('\n=== NODES ===')
if (gltf.nodes) {
  gltf.nodes.forEach((node, i) => {
    const meshInfo = node.mesh !== undefined ? ` [mesh:${node.mesh}]` : ''
    const children = node.children ? ` children:[${node.children.join(',')}]` : ''
    console.log(`  ${i}: "${node.name || '(unnamed)'}"${meshInfo}${children}`)
  })
}

// Print animation names
console.log('\n=== ANIMATIONS ===')
if (gltf.animations) {
  gltf.animations.forEach((anim, i) => {
    const channelCount = anim.channels ? anim.channels.length : 0
    console.log(`  ${i}: "${anim.name || '(unnamed)'}" (${channelCount} channels)`)
  })
}

// Print mesh names
console.log('\n=== MESHES ===')
if (gltf.meshes) {
  gltf.meshes.forEach((mesh, i) => {
    console.log(`  ${i}: "${mesh.name || '(unnamed)'}"`)
  })
}

// Print material names
console.log('\n=== MATERIALS ===')
if (gltf.materials) {
  gltf.materials.forEach((mat, i) => {
    console.log(`  ${i}: "${mat.name || '(unnamed)'}"`)
  })
}
