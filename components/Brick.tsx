import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Color, Group, Vector3, MathUtils } from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
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
  
  const sizeX = Math.max(1, data.sizeX || 1);
  const sizeZ = Math.max(1, data.sizeZ || 1);

  // Animation state
  const targetY = data.y * BRICK_HEIGHT + (BRICK_HEIGHT / 2);
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
      if (meshRef.current) {
         // Smooth Lerp for ghost movement (free moving feel)
         const lerpFactor = 25 * delta;
         meshRef.current.position.x = MathUtils.lerp(meshRef.current.position.x, positionX, lerpFactor);
         meshRef.current.position.z = MathUtils.lerp(meshRef.current.position.z, positionZ, lerpFactor);
         meshRef.current.position.y = MathUtils.lerp(meshRef.current.position.y, targetY, lerpFactor);
      }
      return;
    }

    if (isWaiting) {
      if (Date.now() > startTimeRef.current) {
        setIsWaiting(false);
      }
      return;
    }

    if (!landed && meshRef.current) {
      // Fast drops
      const gravity = 250; 
      const bounceFactor = 0.05; 
      
      velocityY.current -= gravity * delta;
      let nextY = currentY + velocityY.current * delta;

      if (nextY <= targetY) {
        nextY = targetY;
        
        if (Math.abs(velocityY.current) > 10) { 
           velocityY.current = -velocityY.current * bounceFactor;
           setScaleY(0.98); 
        } else {
           setLanded(true);
           velocityY.current = 0;
           setScaleY(1);
           if (onLand) onLand();
        }
      }

      setCurrentY(nextY);
      meshRef.current.position.set(positionX, nextY, positionZ);
      
      if (scaleY < 1) {
          setScaleY(Math.min(1, scaleY + delta * 25));
      }
      meshRef.current.scale.set(1, scaleY, 1);
    }
  });

  useEffect(() => {
    if (!isGhost) {
      setLanded(false);
      setCurrentY(startY);
      setIsWaiting(delay > 0);
      startTimeRef.current = Date.now() + delay;
      velocityY.current = 0;
      setScaleY(1);
    }
  }, [data.id, isGhost, delay]);

  const safeSizeX = Math.max(1, Math.floor(sizeX));
  const safeSizeZ = Math.max(1, Math.floor(sizeZ));

  const materialProps = {
    color: isGhost ? data.color : new Color(data.color),
    transparent: isGhost,
    opacity: isGhost ? 0.6 : 1,
    roughness: 0.2,
    metalness: 0.1,
  };

  // Rendering for Special Types
  if (data.specialType === 'TIRE') {
    // Tire Rendering (Vertical Wheel)
    return (
      <group ref={meshRef} position={[positionX, currentY, positionZ]} visible={!isWaiting}>
        <group rotation={[0, data.rotation === 90 ? Math.PI / 2 : 0, Math.PI / 2]}>
          {/* Tire Rubber */}
          <mesh castShadow receiveShadow>
             <cylinderGeometry args={[0.7, 0.7, 0.4, 24]} />
             <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          {/* Rim */}
          <mesh position={[0, 0, 0]}>
             <cylinderGeometry args={[0.4, 0.4, 0.42, 16]} />
             <meshStandardMaterial color="#ccc" metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      </group>
    );
  }

  const isAxle = data.specialType === 'AXLE';

  return (
    <group ref={meshRef} position={[positionX, currentY, positionZ]} visible={!isWaiting}>
      {/* Main Brick Body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[sizeX * BRICK_WIDTH - 0.04, BRICK_HEIGHT, sizeZ * BRICK_DEPTH - 0.04]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Axle Peg (if axle) */}
      {isAxle && (
        <group position={[0, 0, sizeZ * BRICK_DEPTH / 2]}>
             <mesh rotation={[Math.PI/2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.5, 12]} />
                <meshStandardMaterial color="#999" />
             </mesh>
        </group>
      )}

      {/* Studs */}
      {Array.from({ length: safeSizeX }).map((_, i) => (
          Array.from({ length: safeSizeZ }).map((_, j) => {
            const sx = (i * BRICK_WIDTH) - xOffset;
            const sz = (j * BRICK_DEPTH) - zOffset;
            return (
              <group key={`${i}-${j}`} position={[sx, BRICK_HEIGHT / 2 + STUD_HEIGHT / 2, sz]}>
                <mesh castShadow>
                  <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
                  <meshStandardMaterial {...materialProps} />
                </mesh>
                <Text
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, STUD_HEIGHT / 2 + 0.002, 0]}
                  fontSize={0.038}
                  color={isGhost ? data.color : "#000000"} 
                  fillOpacity={isGhost ? 0.5 : 0.12}
                  anchorX="center"
                  anchorY="middle"
                  renderOrder={1}
                >
                  BRICK GENIUS
                </Text>
              </group>
            )
          })
      ))}
    </group>
  );
};

export default Brick;