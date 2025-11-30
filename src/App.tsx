import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Scene from './components/Scene';
import Controls from './components/Controls';
import { BrickData, ToolMode, BrickColor, BrickType } from './types';
import { BRICK_TYPES } from './constants';
import { generateLegoFromImage } from './services/geminiService';
import { optimizeBricks } from './utils/brickUtils';
import { useSound } from './hooks/useSound';
import { useHistory } from './hooks/useHistory';



function App() {
  // Use custom hooks
  const { bricks, saveToHistory, undo, redo, canUndo, canRedo } = useHistory([]);
  const { playLandedSound } = useSound();

  // Component state
  const [toolMode, setToolMode] = useState<ToolMode>('VIEW');
  const [selectedColor, setSelectedColor] = useState<string>(BrickColor.RED);
  const [selectedBrickType, setSelectedBrickType] = useState<BrickType>(BRICK_TYPES?.[0] || { label: '1x1', sizeX: 1, sizeZ: 1 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [buildKey, setBuildKey] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [liftedGroup, setLiftedGroup] = useState<{ bricks: BrickData[], anchorId: string } | null>(null);


  // Helper: Get Liftable Group (Upwards only)
  // Allows breaking a stack by grabbing a middle brick.
  const getLiftableBricks = (startBrickId: string, allBricks: BrickData[]): string[] => {
    const startBrick = allBricks.find(b => b.id === startBrickId);
    if (!startBrick) return [];

    const queue = [startBrick];
    const resultIds = new Set<string>([startBrickId]);

    // Check intersection/overlap
    const isOverlapping = (b1: BrickData, b2: BrickData) => {
        const b1W = b1.sizeX || 1;
        const b1D = b1.sizeZ || 1;
        const b2W = b2.sizeX || 1;
        const b2D = b2.sizeZ || 1;

        // Use slight margin to catch exact alignments
        const xOverlap = Math.max(b1.x, b2.x) < Math.min(b1.x + b1W, b2.x + b2W);
        const zOverlap = Math.max(b1.z, b2.z) < Math.min(b1.z + b1D, b2.z + b2D);
        return xOverlap && zOverlap;
    };

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Find all bricks immediately ON TOP of 'current'
      // This enforces upward-only traversal
      const supported = allBricks.filter(b => 
        !resultIds.has(b.id) && 
        b.y === current.y + 1 &&
        isOverlapping(current, b)
      );

      supported.forEach(b => {
        resultIds.add(b.id);
        queue.push(b);
      });
    }

    return Array.from(resultIds);
  };

  const rotateLiftedGroup = useCallback(() => {
    if (!liftedGroup) {
        setRotated(prev => !prev);
        return;
    }
    
    setLiftedGroup(prev => {
        if (!prev) return null;
        const newBricks = prev.bricks.map(b => {
            // Rotate 90 degrees around anchor (0,0)
            const newOffsetX = b.offsetZ!;
            const newOffsetZ = -b.offsetX! - (b.sizeX || 1); // Compensate for pivot
            
            return {
                ...b,
                offsetX: newOffsetX,
                offsetZ: newOffsetZ,
                // Swap dimensions
                sizeX: b.sizeZ,
                sizeZ: b.sizeX,
                rotation: b.rotation === 0 ? 90 : 0
            };
        });
        return { ...prev, bricks: newBricks };
    });
  }, [liftedGroup]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        rotateLiftedGroup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateLiftedGroup]);

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
      rotation: rotated ? 90 : 0,
      specialType: selectedBrickType.specialType
    };
    
    const newBricks = [...(bricks || []), newBrick];
    saveToHistory(newBricks);
    playLandedSound();
  }, [bricks, selectedColor, selectedBrickType, rotated, playLandedSound, saveToHistory]);

  const handleLiftBrick = (brickId: string) => {
    if (!bricks) return;
    
    // Use new Lift logic: Grab clicked brick + everything physically supported by it
    const liftableIds = getLiftableBricks(brickId, bricks);
    
    const group = bricks.filter(b => liftableIds.includes(b.id));
    const anchorBrick = group.find(b => b.id === brickId);

    if (!anchorBrick) return;
    
    // Calculate relative offsets
    const groupWithOffsets = group.map(b => ({
        ...b,
        offsetX: b.x - anchorBrick.x,
        offsetY: b.y - anchorBrick.y, // Positive since we only grab upwards
        offsetZ: b.z - anchorBrick.z,
    }));

    const remainingBricks = bricks.filter(b => !liftableIds.includes(b.id));
    saveToHistory(remainingBricks);
    setLiftedGroup({ bricks: groupWithOffsets, anchorId: brickId });
    playLandedSound();
  };

  const handleDropGroup = (anchorX: number, anchorY: number, anchorZ: number) => {
    if (!liftedGroup) return;

    const proposedBricks = liftedGroup.bricks.map(b => ({
        ...b,
        x: anchorX + (b.offsetX || 0),
        y: anchorY + (b.offsetY || 0),
        z: anchorZ + (b.offsetZ || 0),
        offsetX: undefined,
        offsetY: undefined,
        offsetZ: undefined
    }));

    // Collision Check
    const hasCollision = proposedBricks.some(pb => {
        return (bricks || []).some(eb => {
             const xOverlap = Math.max(pb.x, eb.x) < Math.min(pb.x + (pb.sizeX||1), eb.x + (eb.sizeX||1));
             const zOverlap = Math.max(pb.z, eb.z) < Math.min(pb.z + (pb.sizeZ||1), eb.z + (eb.sizeZ||1));
             const yOverlap = pb.y === eb.y;
             return xOverlap && zOverlap && yOverlap;
        });
    });

    if (!hasCollision) {
        const newBricks = [...(bricks || []), ...proposedBricks];
        saveToHistory(newBricks);
        setLiftedGroup(null);
        playLandedSound();
    }
  };

  const removeBrick = useCallback((id: string) => {
    const newBricks = (bricks || []).filter((b) => b.id !== id);
    saveToHistory(newBricks);
  }, [bricks, saveToHistory]);

  const clearBricks = useCallback(() => {
    saveToHistory([]);
    setLiftedGroup(null);
  }, [saveToHistory]);

  // Reset lifted group on undo/redo
  useEffect(() => {
    setLiftedGroup(null);
  }, [bricks]);

  const handleReplay = useCallback(() => {
    setIsAnimating(true);
    setBuildKey(prev => prev + 1);
    const duration = (bricks?.length || 0) * 15 + 1000;
    setTimeout(() => setIsAnimating(false), duration);
  }, [bricks]);

  const handleGenerate = async (file: File) => {
    setIsGenerating(true);
    setToolMode('VIEW');
    setLiftedGroup(null);

    try {
      const result = await generateLegoFromImage(file);
      
      if (result && result.bricks) {
        const rawBricks = result.bricks.map(b => ({
            x: b.x,
            y: b.y,
            z: b.z,
            color: b.color || BrickColor.RED
        }));

        const optimizedBricks = optimizeBricks(rawBricks);
        optimizedBricks.sort((a, b) => a.y - b.y);

        saveToHistory(optimizedBricks);
        
        setIsAnimating(true);
        const duration = optimizedBricks.length * 15 + 1000;
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
        hasBricks={bricks?.length > 0}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <Scene 
        bricks={bricks || []} 
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