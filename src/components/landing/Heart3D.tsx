"use client"

import { Suspense, useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei"
import * as THREE from "three"

function HeartMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)

  const heartShape = useMemo(() => {
    const shape = new THREE.Shape()
    const x = 0, y = 0
    shape.moveTo(x, y + 0.35)
    shape.bezierCurveTo(x, y + 0.55, x - 0.1, y + 0.7, x - 0.35, y + 0.7)
    shape.bezierCurveTo(x - 0.7, y + 0.7, x - 0.7, y + 0.35, x - 0.7, y + 0.35)
    shape.bezierCurveTo(x - 0.7, y + 0.1, x - 0.45, y - 0.2, x, y - 0.5)
    shape.bezierCurveTo(x + 0.45, y - 0.2, x + 0.7, y + 0.1, x + 0.7, y + 0.35)
    shape.bezierCurveTo(x + 0.7, y + 0.35, x + 0.7, y + 0.7, x + 0.35, y + 0.7)
    shape.bezierCurveTo(x + 0.1, y + 0.7, x, y + 0.55, x, y + 0.35)
    return shape
  }, [])

  const geometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      curveSegments: 32,
    })
  }, [heartShape])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    meshRef.current.rotation.y = t * 0.3
    const heartbeat = 1 + Math.sin(t * 2.5) * 0.04
    meshRef.current.scale.setScalar(heartbeat * 2.2)
  })

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[0, 0, Math.PI]}>
      <meshPhysicalMaterial
        ref={materialRef}
        color="#2563eb"
        emissive="#1d4ed8"
        emissiveIntensity={0.3}
        roughness={0.2}
        metalness={0.1}
        transparent
        opacity={0.85}
        clearcoat={0.8}
        clearcoatRoughness={0.2}
      />
    </mesh>
  )
}

function Particles() {
  const count = 40
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4
    }
    return pos
  }, [])

  const ref = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.05
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#60a5fa"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} color="#1a1a2e" />
      <pointLight position={[2, 2, 3]} intensity={1.2} color="#3b82f6" />
      <pointLight position={[-2, -1, 2]} intensity={0.6} color="#06b6d4" />
      <pointLight position={[0, -2, 1]} intensity={0.4} color="#8b5cf6" />
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <HeartMesh />
      </Float>
      <Particles />
    </>
  )
}

function HeartFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-40 w-40 rounded-full bg-primary/10 animate-glow-pulse" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          className="h-20 w-20"
          aria-hidden="true"
        >
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

export default function Heart3D({ className = "" }: { className?: string }) {
  return (
    <div className={`${className}`} aria-hidden="true">
      <Suspense fallback={<HeartFallback />}>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
          dpr={[1, 2]}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  )
}
