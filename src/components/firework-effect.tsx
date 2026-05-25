import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  decay: number
  color: string
  size: number
}

interface Rocket {
  x: number
  y: number
  vy: number
  targetY: number
  color: string
  dead: boolean
  trail: { x: number; y: number; alpha: number }[]
}

const COLORS = [
  '#FFD700', // gold
  '#FF8C00', // dark orange
  '#FF4500', // red-orange
  '#FF69B4', // hot pink
  '#ADFF2F', // green-yellow
  '#00CED1', // turquoise
  '#FF1493', // deep pink
  '#FFA500', // orange
]

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function FireworkEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const context = ctx

    let width = canvas.clientWidth
    let height = canvas.clientHeight

    function resize() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const rockets: Rocket[] = []
    const particles: Particle[] = []
    const startTime = performance.now()
    const duration = 3500
    const rocketInterval = 280
    let lastRocketTime = startTime
    let running = true

    function spawnRocket() {
      const color = randomColor()
      rockets.push({
        x: randomRange(width * 0.15, width * 0.85),
        y: height,
        vy: randomRange(-height * 0.012, -height * 0.018),
        targetY: randomRange(height * 0.15, height * 0.45),
        color,
        dead: false,
        trail: [],
      })
    }

    function explode(rocket: Rocket) {
      const count = Math.floor(randomRange(24, 40))
      for (let i = 0; i < count; i++) {
        const angle = randomRange(0, Math.PI * 2)
        const speed = randomRange(1.5, 5)
        particles.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: randomRange(0.012, 0.022),
          color: rocket.color,
          size: randomRange(1.5, 3),
        })
      }
    }

    function update(now: number) {
      if (!running) return

      const elapsed = now - startTime
      const stillSpawning = elapsed < duration

      // Spawn new rockets
      if (stillSpawning && now - lastRocketTime > rocketInterval) {
        spawnRocket()
        lastRocketTime = now
      }

      // Update rockets
      for (const r of rockets) {
        if (r.dead) continue
        r.trail.push({ x: r.x, y: r.y, alpha: 0.8 })
        if (r.trail.length > 8) r.trail.shift()
        r.y += r.vy
        r.vy += 0.08 // slight gravity on rocket
        if (r.vy >= 0 || r.y <= r.targetY) {
          r.dead = true
          explode(r)
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12 // gravity
        p.vx *= 0.985 // air resistance
        p.alpha -= p.decay
        if (p.alpha <= 0) {
          particles.splice(i, 1)
        }
      }

      // Stop when done spawning and all particles cleared
      if (!stillSpawning && rockets.every((r) => r.dead) && particles.length === 0) {
        running = false
        return
      }
    }

    function draw() {
      context.clearRect(0, 0, width, height)

      // Draw rocket trails
      for (const r of rockets) {
        if (r.trail.length < 2) continue
        for (let i = 0; i < r.trail.length; i++) {
          const t = r.trail[i]
          const alpha = (i / r.trail.length) * 0.5
          context.beginPath()
          context.arc(t.x, t.y, 1.5, 0, Math.PI * 2)
          context.fillStyle = r.color
          context.globalAlpha = alpha
          context.fill()
        }
      }

      // Draw particles
      for (const p of particles) {
        context.beginPath()
        context.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        context.fillStyle = p.color
        context.globalAlpha = Math.max(0, p.alpha)
        context.fill()
      }

      context.globalAlpha = 1
    }

    function loop(now: number) {
      if (!running) return
      update(now)
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        animation: 'firework-fade-in 250ms ease-out',
      }}
    />
  )
}
