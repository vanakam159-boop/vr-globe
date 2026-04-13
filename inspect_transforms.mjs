import { readFileSync } from 'fs'

const buffer = readFileSync('./assests/Season Board.glb')
const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
const chunk0Length = dataView.getUint32(12, true)
const jsonStr = buffer.slice(20, 20 + chunk0Length).toString('utf8')
const gltf = JSON.parse(jsonStr)

// Print node transforms for important nodes
const importantNodes = ['Spring', 'Summer', 'Autumn', 'Snow', 'Board', 'Cloud', 'Season Board ( rotator)', 'Season_Board_(_rotator)', 'Flower', 'Fish_Red', 'Fish_Yellow']

console.log('\n=== NODE TRANSFORMS ===')
if (gltf.nodes) {
  gltf.nodes.forEach((node, i) => {
    const name = node.name || '(unnamed)'
    if (importantNodes.some(n => name.includes(n)) || name.includes('Season') || name.includes('Land')) {
      console.log(`  ${i}: "${name}"`)
      if (node.translation) console.log(`    translation: [${node.translation.map(v => v.toFixed(4)).join(', ')}]`)
      if (node.rotation) console.log(`    rotation: [${node.rotation.map(v => v.toFixed(4)).join(', ')}]`)
      if (node.scale) console.log(`    scale: [${node.scale.map(v => v.toFixed(4)).join(', ')}]`)
      if (node.matrix) console.log(`    matrix: [${node.matrix.map(v => v.toFixed(4)).join(', ')}]`)
      if (node.children) console.log(`    children: [${node.children.join(', ')}]`)
      if (!node.translation && !node.rotation && !node.scale && !node.matrix) console.log(`    (no transform - identity)`)
    }
  })
}
