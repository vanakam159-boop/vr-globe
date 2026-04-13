import React from 'react'

/**
 * BalanceBoardUI — Connection UI for Balance Board
 * ─────────────────────────────────────────────────
 * Shows connection status, last detected direction, and connect/disconnect button
 */

export default function BalanceBoardUI({ 
  isConnected, 
  lastDirection, 
  error, 
  onConnect, 
  onDisconnect 
}) {
  const handleConnect = async () => {
    await onConnect((direction) => {
      // This is just for logging/UI updates
      // The actual game action is handled in App.jsx
      console.log('[BalanceBoardUI] Direction detected:', direction)
    })
  }

  const getDirectionIcon = () => {
    switch (lastDirection) {
      case 'left': return '⬅️'
      case 'right': return '➡️'
      default: return '⏺️'
    }
  }

  const getDirectionColor = () => {
    switch (lastDirection) {
      case 'left': return '#ffc145'
      case 'right': return '#56e39f'
      default: return '#888'
    }
  }

  return (
    <div className="balance-board-ui glass-panel">
      <div className="balance-board-header">
        <span className="balance-board-icon">⚖️</span>
        <span className="balance-board-title">Balance Board</span>
        <span 
          className={`balance-board-status ${isConnected ? 'connected' : 'disconnected'}`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        >
          {isConnected ? '🟢' : '⚪'}
        </span>
      </div>

      {isConnected && (
        <div className="balance-board-direction">
          <span className="direction-label">Last Tilt:</span>
          <span 
            className="direction-value"
            style={{ color: getDirectionColor() }}
          >
            {getDirectionIcon()} {lastDirection.toUpperCase()}
          </span>
        </div>
      )}

      {error && (
        <div className="balance-board-error">
          ⚠️ {error}
        </div>
      )}

      <button 
        className={`balance-board-btn ${isConnected ? 'disconnect' : 'connect'}`}
        onClick={isConnected ? onDisconnect : handleConnect}
      >
        {isConnected ? '🔌 Disconnect' : '🔗 Connect'}
      </button>

      <div className="balance-board-hint">
        {isConnected 
          ? 'Tilt to spin • Center to coast & stop' 
          : 'Click Connect and select your ESP32 port'}
      </div>
    </div>
  )
}
