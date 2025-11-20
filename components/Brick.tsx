import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Color, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { BrickData } from '../types';
import { BRICK_HEIGHT, BRICK_WIDTH, BRICK_DEPTH, STUD_RADIUS, STUD_HEIGHT } from '../constants';

interface BrickProps {
  data: BrickData;
  isGhost?: boolean;
  onLand?: () => void;
  delay?: number;
}

const Brick: React.FC<BrickProps> = ({ data, isGhost = false, onLand, delay = 0 }) => {
  const meshRef = useRef<Group>(null);
  
  const sizeX = data.sizeX || 1;
  const sizeZ = data.sizeZ || 1;

  // Animation state
  const targetY = data.y * BRICK_HEIGHT + (BRICK_HEIGHT / 2);
  // Start high up in the sky for animation if not ghost
  const startY = 35 + Math.random() * 10;
  const [currentY, setCurrentY] = useState(isGhost ? targetY : startY);
  const [landed, setLanded] = useState(isGhost);
  
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
      if (meshRef.current) {
        meshRef.current.position.set(positionX, targetY, positionZ);
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
      // Gravity/fall animation
      const speed = 25 * delta; // Fast fall
      const dist = currentY - targetY;
      
      if (dist < 0.08) {
        // Snap to grid
        setCurrentY(targetY);
        setLanded(true);
        if (meshRef.current) meshRef.current.position.set(positionX, targetY, positionZ);
        if (onLand) onLand(); // Play sound on impact
      } else {
        // Fall down
        const nextY = currentY - (dist * speed * 0.5) - 0.1;
        setCurrentY(Math.max(nextY, targetY));
        meshRef.current.position.set(positionX, nextY, positionZ);
      }
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
    }
  }, [data.id, isGhost, delay]);

  const materialProps = {
    color: isGhost ? data.color : new Color(data.color),
    transparent: isGhost,
    opacity: isGhost ? 0.5 : 1,
    roughness: 0.2,
    metalness: 0.1,
  };

  // Generate studs positions relative to the brick center
  const studs = useMemo(() => {
    const studList = [];
    for (let i = 0; i < sizeX; i++) {
      for (let j = 0; j < sizeZ; j++) {
        // Local position relative to center
        const sx = (i * BRICK_WIDTH) - xOffset;
        const sz = (j * BRICK_DEPTH) - zOffset;
        studList.push({ x: sx, z: sz, key: `${i}-${j}` });
      }
    }
    return studList;
  }, [sizeX, sizeZ, xOffset, zOffset]);

  return (
    <group ref={meshRef} position={[positionX, currentY, positionZ]} visible={!isWaiting}>
      {/* Main Brick Body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[sizeX * BRICK_WIDTH - 0.04, BRICK_HEIGHT, sizeZ * BRICK_DEPTH - 0.04]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Studs */}
      {studs.map((stud) => (
        <mesh key={stud.key} castShadow position={[stud.x, BRICK_HEIGHT / 2 + STUD_HEIGHT / 2, stud.z]}>
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      ))}
    </group>
  );
};

export default Brick;