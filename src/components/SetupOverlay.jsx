import React from 'react'

/**
 * SetupOverlay — Debug / Dev panel
 * Shows real-time Position, Rotation, Scale of the 3D model.
 * Toggle between Free Look (Orbit) and Locked (Game) camera.
 */
export default function SetupOverlay({
  masterPos, masterRot, masterScale,
  setMasterPos, setMasterRot, setMasterScale,
  freeLook, onToggleFreeLook
}) {

  const handleVecChange = (setter, index, value) => {
    setter(prev => {
      const next = [...prev];
      next[index] = parseFloat(value) || 0;
      return next;
    });
  }

  const VectorInput = ({ label, value, setter }) => (
    <div className="transform-row">
      <span className="transform-label">{label}</span>
      <div className="transform-inputs">
        <input type="number" step="0.1" value={value[0]} onChange={(e) => handleVecChange(setter, 0, e.target.value)} />
        <input type="number" step="0.1" value={value[1]} onChange={(e) => handleVecChange(setter, 1, e.target.value)} />
        <input type="number" step="0.1" value={value[2]} onChange={(e) => handleVecChange(setter, 2, e.target.value)} />
      </div>
    </div>
  )

  return (
    <div className="setup-overlay glass-panel" id="setup-overlay">
      <h2>Setup Mode</h2>

      <VectorInput label="Position" value={masterPos} setter={setMasterPos} />
      <VectorInput label="Rotation" value={masterRot} setter={setMasterRot} />
      <VectorInput label="Scale"    value={masterScale} setter={setMasterScale} />

      <div style={{ marginTop: 14 }}>
        <button
          id="toggle-freelook"
          className={`btn btn-primary ${freeLook ? 'active' : ''}`}
          onClick={onToggleFreeLook}
        >
          {freeLook ? '🔓 Free Look ON' : '🔒 Camera Locked'}
        </button>
      </div>
    </div>
  )
}
