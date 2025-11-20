import React, { useState, useCallback, useEffect } from 'react';
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

  // Sound Effect - Plays when a brick hits the ground/another brick
  const playLandedSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const t = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      // Synthesize a "plastic click/thud" sound
      osc.type = 'square'; // Square wave gives a hollow plastic character
      // Randomize pitch slightly for realism on multiple drops
      const baseFreq = 150 + Math.random() * 50;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      
      // Filter to remove harshness
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.08);
      
      // Envelope
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.01); // Attack
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1); // Decay
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(t + 0.15);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  // Rotation hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        setRotated(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  }, [selectedColor, selectedBrickType, rotated]);

  // Remove a brick by ID
  const removeBrick = useCallback((id: string) => {
    setBricks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Clear all bricks
  const clearBricks = useCallback(() => {
    setBricks([]);
  }, []);

  // Replay Animation
  const handleReplay = useCallback(() => {
    setIsAnimating(true);
    setBuildKey(prev => prev + 1);
    
    // Automatically disable animation mode after expected duration so manual builds don't lag
    // 100ms per brick + 2s buffer
    const duration = bricks.length * 100 + 2500;
    setTimeout(() => setIsAnimating(false), duration);
  }, [bricks.length]);

  // Handle AI Generation
  const handleGenerate = async (file: File) => {
    setIsGenerating(true);
    setBricks([]); 
    setToolMode('VIEW');

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
      />
      
    </div>
  );
}

export default App;