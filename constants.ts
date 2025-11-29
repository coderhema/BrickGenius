import { BrickColor, BrickType } from "./types";

export const BRICK_WIDTH = 1;
export const BRICK_HEIGHT = 1.2; // Standard bricks are slightly taller than wide/deep
export const BRICK_DEPTH = 1;
export const STUD_RADIUS = 0.25;
export const STUD_HEIGHT = 0.2;

export const PALETTE = [
  { name: 'Red', value: BrickColor.RED },
  { name: 'Blue', value: BrickColor.BLUE },
  { name: 'Green', value: BrickColor.GREEN },
  { name: 'Yellow', value: BrickColor.YELLOW },
  { name: 'Orange', value: BrickColor.ORANGE },
  { name: 'White', value: BrickColor.WHITE },
  { name: 'Black', value: BrickColor.BLACK },
  { name: 'Grey', value: BrickColor.GREY },
];

export const BRICK_TYPES: BrickType[] = [
  { label: '1x1', sizeX: 1, sizeZ: 1 },
  { label: '1x2', sizeX: 1, sizeZ: 2 },
  { label: '1x3', sizeX: 1, sizeZ: 3 },
  { label: '1x4', sizeX: 1, sizeZ: 4 },
  { label: '2x2', sizeX: 2, sizeZ: 2 },
  { label: '2x3', sizeX: 2, sizeZ: 3 },
  { label: '2x4', sizeX: 2, sizeZ: 4 },
  { label: '2x2 Axle', sizeX: 2, sizeZ: 2, specialType: 'AXLE' },
  { label: 'Wheel', sizeX: 1, sizeZ: 1, specialType: 'TIRE' },
];

export const MAX_BOARD_SIZE = 20; // -10 to 10 grid