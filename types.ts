export enum BrickColor {
  RED = '#EF4444',
  BLUE = '#3B82F6',
  GREEN = '#22C55E',
  YELLOW = '#EAB308',
  WHITE = '#F9FAFB',
  BLACK = '#1F2937',
  ORANGE = '#F97316',
  PURPLE = '#A855F7',
  GREY = '#9CA3AF'
}

export interface BrickData {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  sizeX?: number; // Width in studs (default 1)
  sizeZ?: number; // Depth in studs (default 1)
  rotation?: number; // Rotation in degrees (0 or 90)
  specialType?: 'AXLE' | 'TIRE';
  
  // For lifted groups
  offsetX?: number; 
  offsetY?: number; 
  offsetZ?: number;
}

export interface GeneratedBuild {
  bricks: Array<Omit<BrickData, 'id'>>;
}

export type ToolMode = 'VIEW' | 'BUILD' | 'DELETE' | 'MOVE';

export interface BrickType {
  label: string;
  sizeX: number;
  sizeZ: number;
  specialType?: 'AXLE' | 'TIRE';
}