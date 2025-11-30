import { v4 as uuidv4 } from 'uuid';
import { BrickData, BrickType } from '../types';
import { BRICK_TYPES } from '../constants';

// Helper to optimize 1x1 voxels into larger standard bricks
export const optimizeBricks = (rawBricks: {x: number, y: number, z: number, color: string}[]): BrickData[] => {
  if (!rawBricks || !Array.isArray(rawBricks)) return [];
  
  const optimized: BrickData[] = [];
  
  // Group bricks by Layer (Y) and Color
  const bricksByLayerColor = new Map<string, Set<string>>();
  
  rawBricks.forEach(b => {
    if (!b) return;
    const key = `${b.y},${b.color}`;
    if (!bricksByLayerColor.has(key)) {
      bricksByLayerColor.set(key, new Set());
    }
    bricksByLayerColor.get(key)?.add(`${b.x},${b.z}`);
  });

  // Filter out special types for auto-optimization (keep strictly standard blocks)
  const standardTypes = (BRICK_TYPES || []).filter(t => !t.specialType).sort((a, b) => 
    (b.sizeX * b.sizeZ) - (a.sizeX * a.sizeZ)
  );

  // Process each layer/color group
  bricksByLayerColor.forEach((coordsSet, key) => {
    const [yStr, color] = key.split(',');
    const y = parseInt(yStr);
    
    // Convert Set to array and sort to process systematically (top-left to bottom-right)
    const coords = Array.from(coordsSet).map(c => {
      const [x, z] = c.split(',').map(Number);
      return { x, z };
    }).sort((a, b) => {
      if (a.z !== b.z) return a.z - b.z;
      return a.x - b.x;
    });

    const processed = new Set<string>();

    coords.forEach(({ x, z }) => {
      const coordKey = `${x},${z}`;
      if (processed.has(coordKey)) return;

      // Try to fit the largest possible brick starting at (x, z)
      let bestFit: { type: BrickType, rotated: boolean } | null = null;

      for (const brickType of standardTypes) {
         // Try Standard Orientation
         let fit = true;
         for(let i = 0; i < brickType.sizeX; i++) {
           for(let j = 0; j < brickType.sizeZ; j++) {
              if (!coordsSet.has(`${x + i},${z + j}`) || processed.has(`${x + i},${z + j}`)) {
                fit = false;
                break;
              }
           }
           if(!fit) break;
         }
         if (fit) {
           bestFit = { type: brickType, rotated: false };
           break; // Found best fit because we are iterating by size desc
         }

         // Try Rotated Orientation (if dimensions differ)
         if (brickType.sizeX !== brickType.sizeZ) {
           fit = true;
           // Rotated: sizeX acts as depth (z), sizeZ acts as width (x)
           const rWidth = brickType.sizeZ;
           const rDepth = brickType.sizeX;

           for(let i = 0; i < rWidth; i++) {
              for(let j = 0; j < rDepth; j++) {
                 if (!coordsSet.has(`${x + i},${z + j}`) || processed.has(`${x + i},${z + j}`)) {
                   fit = false;
                   break;
                 }
              }
              if(!fit) break;
           }
           if (fit) {
              bestFit = { type: brickType, rotated: true };
              break;
           }
         }
      }

      if (bestFit) {
         const width = bestFit.rotated ? bestFit.type.sizeZ : bestFit.type.sizeX;
         const depth = bestFit.rotated ? bestFit.type.sizeX : bestFit.type.sizeZ;

         // Mark as processed
         for(let i = 0; i < width; i++) {
            for(let j = 0; j < depth; j++) {
               processed.add(`${x + i},${z + j}`);
            }
         }

         optimized.push({
            id: uuidv4(),
            x,
            y,
            z,
            color,
            sizeX: width,
            sizeZ: depth,
            rotation: bestFit.rotated ? 90 : 0 
         });
      } else {
         // Fallback 1x1 
         if (!processed.has(coordKey)) {
            processed.add(coordKey);
            optimized.push({
               id: uuidv4(),
               x,
               y,
               z,
               color,
               sizeX: 1,
               sizeZ: 1
            });
         }
      }
    });
  });

  return optimized;
};
