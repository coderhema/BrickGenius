import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Color, Group, Mesh, BoxGeometry, MeshStandardMaterial, CylinderGeometry, Vector3 } from 'three';
import { useFrame, Object3DNode } from '@react-three/fiber';
import { BrickData } from '../types';
import { BRICK_HEIGHT, BRICK_WIDTH, BRICK_DEPTH, STUD_RADIUS, STUD_HEIGHT } from '../constants';

// Extend JSX.IntrinsicElements to include Three.js elements managed by @react-three/fiber
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      cylinderGeometry: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      cylinderGeometry: any;
    }
  }
}

interface BrickProps {
  data: BrickData;
  isGhost?: boolean;
  onLand?: () => void;
  delay?: number;
}

const Brick: React.FC<BrickProps> = ({ data, isGhost = false, onLand, delay = 0 }) => {
  const meshRef = useRef<Group>(null);
  
  const sizeX = Math.max(1, data.sizeX || 1);
  const sizeZ = Math.max(1, data.sizeZ || 1);

  // Animation state
  const targetY = data.y * BRICK_HEIGHT + (BRICK_HEIGHT / 2);
  // Start high up in the sky for animation if not ghost
  const startY = 35 + Math.random() * 10;
  const [currentY, setCurrentY] = useState(isGhost ? targetY : startY);
  const [landed, setLanded] = useState(isGhost);
  
  // Physics / Bounce state
  const velocityY = useRef(0);
  const [scaleY, setScaleY] = useState(1);
  
  // Sequential Animation Logic
  const startTimeRef = useRef(Date.now() + delay);
  const [isWaiting, setIsWaiting] = useState(!isGhost && delay > 0);

  // Calculate center position based on size
  const xOffset = ((sizeX - 1) / 2) * BRICK_WIDTH;
  const zOffset = ((sizeZ - 1) / 2) * BRICK_DEPTH;
  
  const positionX = data.x * BRICK_WIDTH + xOffset;
  const positionZ = data.z * BRICK_DEPTH + zOffset;

  useFrame((state, delta) => {
    if (isGhost) {
      // If ghost, we strictly follow the props (or lerp to them for smooth "Hand" feel)
      if (meshRef.current) {
         // If this is a simple ghost (builder mode), we set position directly.
         meshRef.current.position.x = positionX;
         meshRef.current.position.z = positionZ;
         meshRef.current.position.y = targetY;
      }
      return;
    }

    // Handle start delay
    if (isWaiting) {
      if (Date.now() > startTimeRef.current) {
        setIsWaiting(false);
      }
      return;
    }

    if (!landed && meshRef.current) {
      // Physics Constants - Tuned for "Locking" feel
      // High gravity for fast drop
      const gravity = 250; 
      // Very low bounce for "hard plastic" snap
      const bounceFactor = 0.05; 
      
      // Apply Gravity
      velocityY.current -= gravity * delta;
      let nextY = currentY + velocityY.current * delta;

      // Floor Collision (Target Y)
      if (nextY <= targetY) {
        nextY = targetY;
        
        // Bounce logic
        if (Math.abs(velocityY.current) > 8) { // Higher threshold so small bounces stop immediately
           // Bounce back up (very slightly)
           velocityY.current = -velocityY.current * bounceFactor;
           
           // Tiny squash effect on impact - barely perceptible for hard plastic
           setScaleY(0.98); 
        } else {
           // Settled / Locked
           setLanded(true);
           velocityY.current = 0;
           setScaleY(1);
           if (onLand) onLand(); // Play sound on impact
        }
      }

      setCurrentY(nextY);
      meshRef.current.position.set(positionX, nextY, positionZ);
      
      // Recover scale (elasticity) - Instant recovery for hard material
      if (scaleY < 1) {
          setScaleY(Math.min(1, scaleY + delta * 25));
      }
      meshRef.current.scale.set(1, scaleY, 1);
    }
  });

  // Reset animation if ID changes (handled by key in Scene mostly, but safe to keep)
  useEffect(() => {
    if (!isGhost) {
      // If props change significantly (like re-generation), reset state
      setLanded(false);
      setCurrentY(startY);
      setIsWaiting(delay > 0);
      startTimeRef.current = Date.now() + delay;
      velocityY.current = 0;
      setScaleY(1);
    }
  }, [data.id, isGhost, delay]);

  // Defensive check for size array generation
  const safeSizeX = Math.max(1, Math.floor(sizeX));
  const safeSizeZ = Math.max(1, Math.floor(sizeZ));

  const materialProps = {
    color: isGhost ? data.color : new Color(data.color),
    transparent: isGhost,
    opacity: isGhost ? 0.6 : 1,
    roughness: 0.2,
    metalness: 0.1,
  };

  return (
    <group ref={meshRef} position={[positionX, currentY, positionZ]} visible={!isWaiting}>
      {/* Main Brick Body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[sizeX * BRICK_WIDTH - 0.04, BRICK_HEIGHT, sizeZ * BRICK_DEPTH - 0.04]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Studs */}
      {/* We generate studs dynamically based on size */}
      {Array.from({ length: safeSizeX }).map((_, i) => (
          Array.from({ length: safeSizeZ }).map((_, j) => {
            const sx = (i * BRICK_WIDTH) - xOffset;
            const sz = (j * BRICK_DEPTH) - zOffset;
            return (
              <mesh key={`${i}-${j}`} castShadow position={[sx, BRICK_HEIGHT / 2 + STUD_HEIGHT / 2, sz]}>
                <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
                <meshStandardMaterial {...materialProps} />
              </mesh>
            )
          })
      ))}
    </group>
  );
};

export default Brick;