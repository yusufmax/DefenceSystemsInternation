"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import createGlobe from "cobe"

interface PulseMarker {
  id: string
  location: [number, number]
  delay: number
  color?: string
}

interface GlobePulseProps {
  className?: string
  speed?: number
}

// Coordinate grid approximation covering the territory of Uzbekistan
const uzbekistanTerritoryGrid: [number, number][] = [
  // Karakalpakstan (Northwest)
  [45.5, 56.5], [45.0, 57.5], [44.5, 58.5], [44.0, 59.5],
  [43.5, 56.5], [43.0, 57.5], [42.5, 58.5], [42.0, 59.5],
  [41.5, 60.5], [41.2, 61.5], [41.8, 60.2],
  
  // Bukhara & Khorezm (West-Center)
  [41.0, 61.2], [40.5, 62.5], [40.0, 63.5],
  [39.5, 64.5], [39.0, 65.5],
  
  // Navoiy (North-Center)
  [43.0, 63.5], [42.5, 64.5], [42.0, 65.5], [41.5, 66.5],
  [41.0, 65.0], [40.5, 66.0],
  
  // Samarkand, Qashqadaryo, Surxondaryo (South)
  [39.8, 66.5], [39.2, 66.0], [38.8, 67.0], [38.2, 67.5],
  [37.8, 67.2], [37.3, 67.8],
  
  // Jizzakh & Sirdaryo (Mid-East)
  [40.8, 67.5], [40.2, 68.2],
  
  // Tashkent Region
  [41.5, 69.2], [41.1, 69.8], [41.8, 70.3],
  
  // Fergana Valley (East Tip)
  [41.0, 71.0], [40.8, 71.8], [40.6, 72.5], [40.4, 71.5]
]

// Generate markers and color them based on Uzbek flag horizontal bands:
// Blue (top), Red thin borders, White (middle), Red thin borders, Green (bottom)
const defaultMarkers: PulseMarker[] = uzbekistanTerritoryGrid.map((location, index) => {
  const lat = location[0]
  let color = "#0099B5" // Default Blue (Azure)

  if (lat > 42.8) {
    color = "#0099B5" // Blue stripe
  } else if (lat > 42.5) {
    color = "#DA1224" // Red thin accent line
  } else if (lat > 40.3) {
    color = "#FFFFFF" // White stripe
  } else if (lat > 40.0) {
    color = "#DA1224" // Red thin accent line
  } else {
    color = "#009943" // Green stripe
  }

  return {
    id: `uz-point-${index}`,
    location,
    delay: (index * 0.08) % 2, // Staggered pulsing animation delays
    color,
  }
})

export function GlobePulse({
  className = "",
  speed = 0.003,
}: GlobePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showFallback, setShowFallback] = useState(false)
  const onRenderCalled = useRef(false)
  
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)

  // Focused on Uzbekistan (lat 41.3775, lon 64.5853)
  // phi = -lon * Math.PI / 180
  // theta = lat * Math.PI / 180
  const uzbekistanPhi = -64.5853 * Math.PI / 180
  const uzbekistanTheta = 41.3775 * Math.PI / 180

  useEffect(() => {
    phiOffsetRef.current = uzbekistanPhi
    thetaOffsetRef.current = uzbekistanTheta
  }, [uzbekistanPhi, uzbekistanTheta])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    if (showFallback || !canvasRef.current || !containerRef.current) return
    const canvas = canvasRef.current
    const container = containerRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let phi = 0

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      return [r, g, b]
    }

    function init() {
      const width = canvas.offsetWidth || container.offsetWidth || 280
      if (width === 0 || globe) return

      try {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl")
        if (!gl) {
          setShowFallback(true)
          return
        }

        globe = createGlobe(canvas, {
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          width,
          height: width,
          phi: uzbekistanPhi,
          theta: uzbekistanTheta,
          dark: 1,
          diffuse: 1.5,
          mapSamples: 18000,
          mapBrightness: 8,
          baseColor: [0.12, 0.12, 0.1], // Tactical dark grey background dots
          markerColor: [0.71, 0.54, 0.24], // Fallback WebGL marker color (antique gold)
          glowColor: [0.08, 0.08, 0.08], // Soft space glow
          markerElevation: 0.015,
          markers: defaultMarkers.map((m) => ({
            location: m.location,
            size: 0.018,
            id: m.id,
            color: hexToRgb(m.color)
          })),
          arcs: [],
          arcColor: [0.71, 0.54, 0.24],
          arcWidth: 0.5,
          arcHeight: 0.25,
          opacity: 0.85,
          onRender: (state) => {
            onRenderCalled.current = true
            if (!isPausedRef.current) {
              // Subtle hover/idle wiggle or rotation, but keep centered on Central Asia
              phi += speed
            }

            const currentPhi = phi + phiOffsetRef.current + dragOffset.current.phi
            const currentTheta = thetaOffsetRef.current + dragOffset.current.theta
            
            state.phi = currentPhi
            state.theta = currentTheta

            // Radius scale for projection coordinates (cobe globe fits around 92% of canvas radius)
            const R = (width / 2) * 0.92
            const cx = width / 2
            const cy = width / 2

            // Project each point to 2D space to control CSS positioning of flag elements
            defaultMarkers.forEach((m) => {
              const latRad = m.location[0] * Math.PI / 180
              const lonRad = m.location[1] * Math.PI / 180

              // 3D Cartesian coordinates on unit sphere
              const x = Math.cos(latRad) * Math.sin(lonRad)
              const y = Math.sin(latRad)
              const z = Math.cos(latRad) * Math.cos(lonRad)

              // Y-axis rotation (phi)
              const x1 = x * Math.cos(currentPhi) - z * Math.sin(currentPhi)
              const z1 = x * Math.sin(currentPhi) + z * Math.cos(currentPhi)

              // X-axis rotation (theta)
              const y2 = y * Math.cos(currentTheta) - z1 * Math.sin(currentTheta)
              const z2 = y * Math.sin(currentTheta) + z1 * Math.cos(currentTheta)

              // Project coordinates to 2D
              const screenX = cx + x1 * R
              const screenY = cy - y2 * R

              // Visibility threshold based on globe depth (z2 > 0 is front, z2 <= 0 is back)
              const isVisible = z2 > 0.05 ? 1 : 0

              container.style.setProperty(`--cobe-x-${m.id}`, `${screenX}px`)
              container.style.setProperty(`--cobe-y-${m.id}`, `${screenY}px`)
              container.style.setProperty(`--cobe-visible-${m.id}`, `${isVisible}`)
            })
          }
        })
        
        animate()
        
        // Safety timeout to verify render actually started
        const renderCheck = setTimeout(() => {
          if (!onRenderCalled.current) {
            setShowFallback(true)
          } else {
            if (canvas) canvas.style.opacity = "1"
          }
        }, 350)
        
        return () => clearTimeout(renderCheck)
      } catch (err) {
        console.error("WebGL context creation or compilation crashed in React:", err)
        setShowFallback(true)
      }
    }

    function animate() {
      animationId = requestAnimationFrame(animate)
    }

    let cleanupCheck: (() => void) | undefined
    if (canvas.offsetWidth > 0) {
      cleanupCheck = init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          cleanupCheck = init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
      if (cleanupCheck) cleanupCheck()
    }
  }, [speed, uzbekistanPhi, uzbekistanTheta, showFallback])

  if (showFallback) {
    return (
      <div 
        className={`relative aspect-square select-none overflow-hidden flex items-center justify-center ${className}`}
      >
        <svg viewBox="0 0 100 60" className="w-full h-full opacity-95">
          {/* Stylized gold background path representing Uzbekistan borders */}
          <path
            d="M 8,10 L 25,7 L 40,8 L 52,15 L 68,14 L 75,20 L 84,18 L 94,22 L 95,28 L 88,32 L 80,30 L 76,27 L 70,30 L 67,42 L 60,40 L 52,48 L 40,43 L 30,42 L 15,35 Z"
            fill="rgba(182, 138, 60, 0.04)"
            stroke="rgba(182, 138, 60, 0.2)"
            strokeWidth="0.5"
          />

          {/* Capital Marker in Tashkent */}
          <g>
            <circle cx="74.7" cy="31.2" r="5" fill="none" stroke="#b68a3c" strokeWidth="0.75">
              <animate attributeName="r" values="2;10;2" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="74.7" cy="31.2" r="2" fill="#b68a3c" />
          </g>

          {/* Plot grid of pulsing dots */}
          {defaultMarkers.map((m) => {
            const lat = m.location[0]
            const lon = m.location[1]
            const x = ((lon - 54.5) / 19.5) * 100
            const y = ((46.5 - lat) / 10.0) * 60

            return (
              <g key={m.id}>
                {/* Pulsing outer ring */}
                <circle cx={x} cy={y} r="3" fill="none" stroke={m.color} strokeWidth="0.5">
                  <animate attributeName="r" values="1;5;1" dur="2.5s" begin={`${m.delay}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" begin={`${m.delay}s`} repeatCount="indefinite" />
                </circle>
                {/* Center dot */}
                <circle cx={x} cy={y} r="1.2" fill={m.color} />
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative aspect-square select-none overflow-hidden ${className}`}
    >
      <style>{`
        @keyframes pulse-expand {
          0% { transform: scaleX(0.2) scaleY(0.2); opacity: 0.9; }
          100% { transform: scaleX(1.4) scaleY(1.4); opacity: 0; }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%", height: "100%", cursor: "grab", opacity: 0,
          transition: "opacity 1.2s ease", borderRadius: "50%", touchAction: "none",
        }}
      />
      {defaultMarkers.map((m) => (
        <div
          key={m.id}
          style={{
            position: "absolute",
            left: `var(--cobe-x-${m.id}, 0px)`,
            top: `var(--cobe-y-${m.id}, 0px)`,
            transform: "translate(-50%, -50%)",
            width: 10,
            height: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            opacity: `var(--cobe-visible-${m.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 6px))`,
            transition: "opacity 0.3s ease, filter 0.3s ease",
          }}
        >
          <span style={{
            position: "absolute",
            width: 24, height: 24,
            border: `2px solid ${m.color}`,
            borderRadius: "50%",
            opacity: 0,
            animation: `pulse-expand 2s ease-out infinite ${m.delay}s`,
          }} />
          <span style={{
            width: 5, height: 5,
            background: m.color,
            borderRadius: "50%",
            boxShadow: `0 0 0 2px #0a0a09, 0 0 0 4px ${m.color}`,
          }} />
        </div>
      ))}
    </div>
  )
}
