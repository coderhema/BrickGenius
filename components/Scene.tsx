import React, { useState } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { BrickData, ToolMode, BrickType } from '../types';
import { MAX_BOARD_SIZE } from '../constants';
import Brick from './Brick';
import { Vector3 } from 'three';

interface SceneProps {
  bricks: BrickData[];
  addBrick: (x: number, y: number, z: number) => void;
  removeBrick: (id: string) => void;
  selectedColor: string;
  selectedBrickType: BrickType;
  toolMode: ToolMode;
  rotated: boolean;
  playLandedSound: () => void;
  buildKey: number;
  isAnimating: boolean;
  liftedGroup?: { bricks: BrickData[], anchorId: string } | null;
  onLiftBrick?: (id: string) => void;
  onDropGroup?: (x: number, y: number, z: number) => void;
}

const GridPlane: React.FC<{
  onPlaneClick: (point: Vector3) => void;
  onPlaneMove: (point: Vector3) => void;
}> = ({ onPlaneClick, onPlaneMove }) => {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]} 
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onPlaneClick(e.point);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        onPlaneMove(e.point);
      }}
    >
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#eeeeee" />
    </mesh>
  );
};

const SceneContent: React.FC<SceneProps> = ({ 
  bricks, 
  addBrick, 
  removeBrick, 
  selectedColor, 
  toolMode,
  selectedBrickType,
  rotated,
  playLandedSound,
  buildKey,
  isAnimating,
  liftedGroup,
  onLiftBrick,
  onDropGroup
}) => {
  const [hoverPos, setHoverPos] = useState<{x: number, y: number, z: number} | null>(null);

  const snapToGrid = (val: number) => Math.round(val);

  const handlePointerMove = (point: Vector3, existingY: number = 0) => {
    if (toolMode !== 'BUILD' && toolMode !== 'MOVE') {
      setHoverPos(null);
      return;
    }
    
    const x = snapToGrid(point.x);
    const z = snapToGrid(point.z);
    
    // Clamp to board
    if (x < -MAX_BOARD_SIZE / 2 || x > MAX_BOARD_SIZE / 2 || z < -MAX_BOARD_SIZE / 2 || z > MAX_BOARD_SIZE / 2) {
      setHoverPos(null);
      return;
    }

    // Use existingY for stacking logic
    setHoverPos({ x, y: existingY, z });
  };

  const handleClick = () => {
    if (toolMode === 'BUILD' && hoverPos) {
      addBrick(hoverPos.x, hoverPos.y, hoverPos.z);
    } else if (toolMode === 'MOVE' && liftedGroup && onDropGroup && hoverPos) {
      onDropGroup(hoverPos.x, hoverPos.y, hoverPos.z);
    }
  };

  const onBrickClick = (e: ThreeEvent<MouseEvent>, brick: BrickData) => {
    e.stopPropagation();
    
    if (toolMode === 'DELETE') {
      removeBrick(brick.id);
    } 
    else if (toolMode === 'MOVE' && !liftedGroup && onLiftBrick) {
      onLiftBrick(brick.id);
    }
    else if (toolMode === 'BUILD') {
      if (e.face?.normal) {
        const normal = e.face.normal;
        const gridX = Math.round(e.point.x);
        const gridY = brick.y; 
        const gridZ = Math.round(e.point.z);

        if (normal.y > 0.5) {
           addBrick(Math.round(e.point.x), gridY + 1, Math.round(e.point.z));
        } else {
           addBrick(
             gridX + Math.round(normal.x), 
             gridY + Math.round(normal.y), 
             gridZ + Math.round(normal.z)
           );
        }
      }
    } else if (toolMode === 'MOVE' && liftedGroup && onDropGroup) {
        // We are holding a group and clicked another brick -> Attempt to place on top or side
         if (e.face?.normal) {
            const normal = e.face.normal;
            const gridX = Math.round(e.point.x);
            const gridY = brick.y; 
            const gridZ = Math.round(e.point.z);
            
            // Determine anchor placement based on click normal
            let targetX = gridX;
            let targetY = gridY;
            let targetZ = gridZ;

            if (normal.y > 0.5) {
                targetX = Math.round(e.point.x);
                targetY = gridY + 1;
                targetZ = Math.round(e.point.z);
            } else {
                targetX = gridX + Math.round(normal.x);
                targetY = gridY + Math.round(normal.y);
                targetZ = gridZ + Math.round(normal.z);
            }
            
            onDropGroup(targetX, targetY, targetZ);
         }
    }
  };
  
  const onBrickHover = (e: ThreeEvent<MouseEvent>, brick: BrickData) => {
    e.stopPropagation();
    
    if (toolMode === 'MOVE' && liftedGroup) {
        // While moving a group, hover logic is similar to build, determining where to drop
        if (e.face?.normal) {
            const normal = e.face.normal;
            if (normal.y > 0.5) {
                setHoverPos({
                    x: Math.round(e.point.x),
                    y: brick.y + 1,
                    z: Math.round(e.point.z)
                });
            } else {
                setHoverPos({
                    x: Math.round(e.point.x) + Math.round(normal.x),
                    y: brick.y + Math.round(normal.y),
                    z: Math.round(e.point.z) + Math.round(normal.z)
                });
            }
        }
        return;
    }

    if (toolMode === 'BUILD' && e.face?.normal) {
        const normal = e.face.normal;
        const gridX = Math.round(e.point.x);
        const gridZ = Math.round(e.point.z);

        if (normal.y > 0.5) {
            setHoverPos({
                x: gridX,
                y: brick.y + 1,
                z: gridZ
            });
        } else {
            setHoverPos({
                x: gridX + Math.round(normal.x),
                y: brick.y + Math.round(normal.y),
                z: gridZ + Math.round(normal.z)
            });
        }
    } else if (toolMode === 'MOVE' && !liftedGroup) {
        // Maybe highlight connected group here in future
        // For now, just normal pointer
        document.body.style.cursor = 'grab';
    }
  };

  const onPointerMissed = () => {
      if (toolMode === 'MOVE' && !liftedGroup) {
          document.body.style.cursor = 'default';
      }
  }

  const activeSizeX = rotated ? selectedBrickType.sizeZ : selectedBrickType.sizeX;
  const activeSizeZ = rotated ? selectedBrickType.sizeX : selectedBrickType.sizeZ;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight 
        castShadow 
        position={[15, 25, 15]} 
        intensity={1.2} 
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      >
        <orthographicCamera attach="shadow-camera" args={[-25, 25, 25, -25]} />
      </directionalLight>
      <Environment preset="city" />

      <group onPointerMissed={onPointerMissed}>
        <group key={buildKey}>
          {bricks.map((brick, index) => (
            <mesh 
              key={brick.id}
              onClick={(e) => onBrickClick(e, brick)}
              onPointerMove={(e) => onBrickHover(e, brick)}
              onPointerOut={() => { document.body.style.cursor = 'default'; }}
            >
              <Brick 
                data={brick} 
                onLand={playLandedSound} 
                delay={isAnimating ? index * 100 : 0} 
              />
            </mesh>
          ))}
        </group>

        {/* Ghost Brick for Builder */}
        {toolMode === 'BUILD' && hoverPos && (
          <Brick 
            data={{ 
              id: 'ghost', 
              x: hoverPos.x, 
              y: hoverPos.y, 
              z: hoverPos.z, 
              color: selectedColor,
              sizeX: activeSizeX,
              sizeZ: activeSizeZ
            }} 
            isGhost 
          />
        )}

        {/* Lifted Group "Ghost" */}
        {toolMode === 'MOVE' && liftedGroup && hoverPos && (
            <group position={[hoverPos.x, hoverPos.y, hoverPos.z]}>
                {liftedGroup.bricks.map((b) => (
                    <Brick 
                        key={b.id}
                        data={{
                            ...b,
                            // Render relative to the group anchor (which is at 0,0,0 of this group)
                            x: b.offsetX || 0,
                            y: b.offsetY || 0,
                            z: b.offsetZ || 0,
                        }}
                        isGhost // Render as transparent/ghost
                    />
                ))}
            </group>
        )}

        <GridPlane 
          onPlaneClick={(p) => handleClick()} 
          onPlaneMove={(p) => handlePointerMove(p)} 
        />
        
        <Grid 
          position={[0, 0.01, 0]} 
          args={[40, 40]} 
          sectionSize={1} 
          sectionThickness={1} 
          sectionColor="#cccccc" 
          cellColor="#e5e5e5" 
          fadeDistance={25} 
        />
      </group>
      
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
    </>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <Canvas shadows camera={{ position: [12, 14, 12], fov: 45 }}>
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Scene;