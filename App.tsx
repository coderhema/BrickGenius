import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Scene from './components/Scene';
import Controls from './components/Controls';
import { BrickData, ToolMode, BrickColor, BrickType } from './types';
import { BRICK_TYPES } from './constants';
import { generateLegoFromImage } from './services/geminiService';

function App() {
  const [bricks, setBricks] = useState<BrickData[]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>('VIEW');
  const [selectedColor, setSelectedColor] = useState<string>(BrickColor.RED);
  const [selectedBrickType, setSelectedBrickType] = useState<BrickType>(BRICK_TYPES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [buildKey, setBuildKey] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [liftedGroup, setLiftedGroup] = useState<{ bricks: BrickData[], anchorId: string } | null>(null);

  // Persistent AudioContext to prevent garbage collection issues and lag
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound Effect - Plays when a brick hits the ground/another brick
  const playLandedSound = useCallback(() => {
    try {
      // Initialize AudioContext lazily
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;

      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(console.error);
      }
      
      const t = ctx.currentTime;
      
      // Layer 1: The "Click" (Sharp, high-pitched snap of plastic studs)
      const oscClick = ctx.createOscillator();
      const gainClick = ctx.createGain();
      
      oscClick.type = 'square'; // Square wave for "plastic" character
      oscClick.frequency.setValueAtTime(1200, t);
      oscClick.frequency.exponentialRampToValueAtTime(600, t + 0.02);
      
      gainClick.gain.setValueAtTime(0.08, t);
      gainClick.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      
      oscClick.connect(gainClick);
      gainClick.connect(ctx.destination);
      
      oscClick.start(t);
      oscClick.stop(t + 0.04);
      
      // Layer 2: The "Clack" (Resonant body impact)
      const oscClack = ctx.createOscillator();
      const gainClack = ctx.createGain();
      
      oscClack.type = 'sine'; // Sine/Triangle for the body weight
      // Slight pitch randomization for natural variation
      const basePitch = 350 + (Math.random() * 60 - 30); 
      oscClack.frequency.setValueAtTime(basePitch, t);
      oscClack.frequency.exponentialRampToValueAtTime(100, t + 0.08);
      
      gainClack.gain.setValueAtTime(0.15, t);
      gainClack.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      
      oscClack.connect(gainClack);
      gainClack.connect(ctx.destination);
      
      oscClack.start(t);
      oscClack.stop(t + 0.12);

    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  // Graph Search for connected bricks
  const getConnectedBricks = (startBrickId: string, allBricks: BrickData[]): string[] => {
    const startBrick = allBricks.find(b => b.id === startBrickId);
    if (!startBrick) return [];

    const queue = [startBrick];
    const visited = new Set<string>([startBrickId]);
    const connectedIds: string[] = [startBrickId];

    const areConnected = (b1: BrickData, b2: BrickData) => {
      // Check vertical adjacency (stacking)
      const yDiff = Math.abs(b1.y - b2.y);
      if (yDiff !== 1) return false;

      // Check horizontal overlap
      const b1Width = b1.sizeX || 1;
      const b1Depth = b1.sizeZ || 1;
      const b2Width = b2.sizeX || 1;
      const b2Depth = b2.sizeZ || 1;

      const xOverlap = Math.max(b1.x, b2.x) < Math.min(b1.x + b1Width, b2.x + b2Width);
      const zOverlap = Math.max(b1.z, b2.z) < Math.min(b1.z + b1Depth, b2.z + b2Depth);

      return xOverlap && zOverlap;
    };

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Find neighbors in allBricks that are connected to 'current'
      // Optimization: In a real large app, we'd use a spatial grid, but O(N^2) for <200 bricks is fine
      for (const brick of allBricks) {
        if (!visited.has(brick.id) && areConnected(current, brick)) {
          visited.add(brick.id);
          connectedIds.push(brick.id);
          queue.push(brick);
        }
      }
    }

    return connectedIds;
  };

  const rotateLiftedGroup = useCallback(() => {
    if (!liftedGroup) {
        setRotated(prev => !prev);
        return;
    }
    
    setLiftedGroup(prev => {
        if (!prev) return null;
        const newBricks = prev.bricks.map(b => {
            // Rotate 90 degrees (x, z) -> (z, -x) relative to 0,0 (offset base)
            const newOffsetX = b.offsetZ!;
            const newOffsetZ = -b.offsetX! - (b.sizeX || 1); // Adjust position due to pivot corner
            
            // Swap dimensions
            return {
                ...b,
                offsetX: newOffsetX,
                offsetZ: newOffsetZ,
                // Fix dimension swap logic: width becomes depth
                // We need to shift position because pivot is top-left
                // Actually, let's just swap sizeX/sizeZ and rely on visual update
                sizeX: b.sizeZ,
                sizeZ: b.sizeX
            };
        });
        return { ...prev, bricks: newBricks };
    });
  }, [liftedGroup]);

  // Rotation hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        rotateLiftedGroup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateLiftedGroup]);

  // Add a brick
  const addBrick = useCallback((x: number, y: number, z: number) => {
    const sizeX = rotated ? selectedBrickType.sizeZ : selectedBrickType.sizeX;
    const sizeZ = rotated ? selectedBrickType.sizeX : selectedBrickType.sizeZ;

    const newBrick: BrickData = {
      id: uuidv4(),
      x,
      y,
      z,
      color: selectedColor,
      sizeX,
      sizeZ,
      rotation: rotated ? 90 : 0
    };
    
    setBricks((prev) => [...prev, newBrick]);
    playLandedSound();
  }, [selectedColor, selectedBrickType, rotated, playLandedSound]);

  // Handle Move/Lift
  const handleLiftBrick = (brickId: string) => {
    // 1. Find all connected bricks
    const connectedIds = getConnectedBricks(brickId, bricks);
    
    // 2. Extract them
    const group = bricks.filter(b => connectedIds.includes(b.id));
    const anchorBrick = group.find(b => b.id === brickId)!;
    
    // 3. Calculate offsets relative to anchor
    const groupWithOffsets = group.map(b => ({
        ...b,
        offsetX: b.x - anchorBrick.x,
        offsetY: b.y - anchorBrick.y,
        offsetZ: b.z - anchorBrick.z,
    }));

    // 4. Remove from board and set to lifted
    setBricks(prev => prev.filter(b => !connectedIds.includes(b.id)));
    setLiftedGroup({ bricks: groupWithOffsets, anchorId: brickId });
    playLandedSound(); // Sound feedback for pickup
  };

  // Handle Drop Group
  const handleDropGroup = (anchorX: number, anchorY: number, anchorZ: number) => {
    if (!liftedGroup) return;

    // 1. Reconstruct world positions
    const proposedBricks = liftedGroup.bricks.map(b => ({
        ...b,
        x: anchorX + (b.offsetX || 0),
        y: anchorY + (b.offsetY || 0),
        z: anchorZ + (b.offsetZ || 0),
        offsetX: undefined,
        offsetY: undefined,
        offsetZ: undefined
    }));

    // 2. Simple Collision Check (prevent overlapping existing bricks)
    // Note: This is a basic check. A robust one would check all proposed bricks against all existing.
    const hasCollision = proposedBricks.some(pb => {
        return bricks.some(eb => {
             // If overlap in 3D space
             const xOverlap = Math.max(pb.x, eb.x) < Math.min(pb.x + (pb.sizeX||1), eb.x + (eb.sizeX||1));
             const zOverlap = Math.max(pb.z, eb.z) < Math.min(pb.z + (pb.sizeZ||1), eb.z + (eb.sizeZ||1));
             const yOverlap = pb.y === eb.y;
             return xOverlap && zOverlap && yOverlap;
        });
    });

    if (!hasCollision) {
        setBricks(prev => [...prev, ...proposedBricks]);
        setLiftedGroup(null);
        playLandedSound();
    } else {
        // Optional: Error sound or visual feedback
    }
  };

  // Remove a brick by ID
  const removeBrick = useCallback((id: string) => {
    setBricks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Clear all bricks
  const clearBricks = useCallback(() => {
    setBricks([]);
    setLiftedGroup(null);
  }, []);

  // Replay Animation
  const handleReplay = useCallback(() => {
    setIsAnimating(true);
    setBuildKey(prev => prev + 1);
    
    // Automatically disable animation mode after expected duration so manual builds don't lag
    const duration = bricks.length * 100 + 2500;
    setTimeout(() => setIsAnimating(false), duration);
  }, [bricks.length]);

  // Handle AI Generation
  const handleGenerate = async (file: File) => {
    setIsGenerating(true);
    setBricks([]); 
    setToolMode('VIEW');
    setLiftedGroup(null);

    try {
      const result = await generateLegoFromImage(file);
      
      if (result && result.bricks) {
        const generatedBricks = result.bricks
          .sort((a, b) => a.y - b.y)
          .map((b) => ({
            ...b,
            id: uuidv4(),
            color: b.color || BrickColor.RED,
            sizeX: 1, 
            sizeZ: 1
          }));

        setBricks(generatedBricks);
        
        // Enable animation sequence
        setIsAnimating(true);
        const duration = generatedBricks.length * 100 + 2500;
        setTimeout(() => setIsAnimating(false), duration);
      }
    } catch (error) {
      console.error("Failed to generate lego build", error);
      alert("Failed to generate build. Please try a simpler image or check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-screen bg-gradient-to-b from-blue-100 to-white relative overflow-hidden">
      
      <Controls 
        toolMode={toolMode}
        setToolMode={setToolMode}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        clearBricks={clearBricks}
        selectedBrickType={selectedBrickType}
        setSelectedBrickType={setSelectedBrickType}
        onReplay={handleReplay}
        hasBricks={bricks.length > 0}
      />

      <Scene 
        bricks={bricks} 
        addBrick={addBrick} 
        removeBrick={removeBrick}
        selectedColor={selectedColor}
        toolMode={toolMode}
        selectedBrickType={selectedBrickType}
        rotated={rotated}
        playLandedSound={playLandedSound}
        buildKey={buildKey}
        isAnimating={isAnimating}
        liftedGroup={liftedGroup}
        onLiftBrick={handleLiftBrick}
        onDropGroup={handleDropGroup}
      />
      
    </div>
  );
}

export default App;