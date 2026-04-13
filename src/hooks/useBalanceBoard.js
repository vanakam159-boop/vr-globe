import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * useBalanceBoard — Web Serial hook for ESP32 Balance Board
 * ─────────────────────────────────────────────────────────
 * Hardware: ESP32-S3 sending sensor data at 115200 baud
 * Data format: "TiltX: 0.02  TiltY: -0.37  Left: 0  Right: 150"
 * 
 * Logic:
 * - One tilt = one action (fires once, then resets to center)
 * - Must return to center before next tilt registers
 * - 150ms auto-reset after firing
 */

const LEFT_TILT_THRESHOLD = 0.18
const RIGHT_TILT_THRESHOLD = 0.12
const AUTO_RESET_DELAY = 150 // ms

export function useBalanceBoard() {
  const [isConnected, setIsConnected] = useState(false)
  const [port, setPort] = useState(null)
  const [lastDirection, setLastDirection] = useState('center')
  const [error, setError] = useState(null)
  
  const portRef = useRef(null)
  const readerRef = useRef(null)
  const readingRef = useRef(false)
  const bufferRef = useRef('')
  const lastDirectionRef = useRef('center')
  const autoResetTimeoutRef = useRef(null)
  const onDirectionCallbackRef = useRef(null)

  // Disconnect and cleanup
  const disconnect = useCallback(async () => {
    readingRef.current = false
    
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current)
      autoResetTimeoutRef.current = null
    }
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel()
        readerRef.current.releaseLock()
      } catch (e) {
        // Ignore release errors
      }
      readerRef.current = null
    }
    
    if (portRef.current) {
      try {
        await portRef.current.close()
      } catch (e) {
        // Ignore close errors
      }
      portRef.current = null
    }
    
    setPort(null)
    setIsConnected(false)
    setLastDirection('center')
    lastDirectionRef.current = 'center'
  }, [])

  // Process a single line of sensor data
  const processLine = useCallback((line) => {
    const match = line.trim().match(
      /TiltX:\s*([-\d.]+)\s+TiltY:\s*([-\d.]+)\s+Left:\s*(\d+)\s+Right:\s*(\d+)/
    )
    if (!match) return

    const tiltY = parseFloat(match[2])
    // const tiltX = parseFloat(match[1])  // Available if needed for forward/back
    // const leftForce = parseInt(match[3], 10)   // Available for pressure
    // const rightForce = parseInt(match[4], 10)  // Available for pressure

    // Determine direction based on tiltY (left/right tilt)
    let direction = 'center'
    if (tiltY > LEFT_TILT_THRESHOLD) direction = 'left'
    else if (tiltY < -RIGHT_TILT_THRESHOLD) direction = 'right'

    const currentLastDirection = lastDirectionRef.current

    // Logic: Only fire when direction CHANGES from center to left/right
    // Ignore transitions from left->right without centering first
    if (direction !== currentLastDirection) {
      if (currentLastDirection === 'center' && direction !== 'center') {
        // Firing a new direction
        lastDirectionRef.current = direction
        setLastDirection(direction)
        
        // Call the callback
        if (onDirectionCallbackRef.current) {
          onDirectionCallbackRef.current(direction)
        }

        // Auto-reset to center after delay
        if (autoResetTimeoutRef.current) {
          clearTimeout(autoResetTimeoutRef.current)
        }
        autoResetTimeoutRef.current = setTimeout(() => {
          lastDirectionRef.current = 'center'
          setLastDirection('center')
          console.log('%c[BalanceBoard] Auto-reset to CENTER', 'color: #56e39f')
        }, AUTO_RESET_DELAY)

        console.log(`%c[BalanceBoard] Direction: ${direction.toUpperCase()} (TiltY: ${tiltY.toFixed(2)})`, 'color: #ffc145; font-weight: bold')
      } else if (direction === 'center') {
        // Returned to center manually
        lastDirectionRef.current = 'center'
        setLastDirection('center')
        if (autoResetTimeoutRef.current) {
          clearTimeout(autoResetTimeoutRef.current)
          autoResetTimeoutRef.current = null
        }
        console.log('%c[BalanceBoard] Centered manually', 'color: #58c4dc')
      }
      // else: left->right or right->left without centering — IGNORED
    }
  }, [])

  // Read loop
  const readLoop = useCallback(async () => {
    if (!readerRef.current) return
    
    try {
      while (readingRef.current) {
        const { value, done } = await readerRef.current.read()
        if (done) break
        if (!value) continue

        bufferRef.current += value
        const lines = bufferRef.current.split('\n')
        bufferRef.current = lines.pop() || ''

        for (const line of lines) {
          processLine(line)
        }
      }
    } catch (err) {
      if (readingRef.current) {
        console.error('[BalanceBoard] Read error:', err)
        setError(`Read error: ${err.message}`)
      }
    }
  }, [processLine])

  // Connect to the balance board
  const connect = useCallback(async (onDirection) => {
    // Store the callback
    onDirectionCallbackRef.current = onDirection
    
    try {
      setError(null)
      
      // Request port from user
      const selectedPort = await navigator.serial.requestPort()
      portRef.current = selectedPort
      setPort(selectedPort)

      // Close if already open (prevents "port already open" error)
      try { 
        await selectedPort.close() 
      } catch {}

      // Open port at 115200 baud
      await selectedPort.open({ baudRate: 115200 })
      
      // Set up text decoder stream
      const decoder = new TextDecoderStream()
      selectedPort.readable.pipeTo(decoder.writable).catch((err) => {
        if (readingRef.current) {
          console.error('[BalanceBoard] Pipe error:', err)
        }
      })
      
      readerRef.current = decoder.readable.getReader()
      readingRef.current = true
      bufferRef.current = ''
      
      setIsConnected(true)
      console.log('%c[BalanceBoard] Connected ✓', 'color: #56e39f; font-weight: bold')
      
      // Start reading
      readLoop()
      
    } catch (err) {
      console.error('[BalanceBoard] Connection error:', err)
      setError(err.message)
      setIsConnected(false)
    }
  }, [readLoop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    port,
    lastDirection,
    error,
    connect,
    disconnect,
  }
}

export default useBalanceBoard
