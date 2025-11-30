export enum BrickColor {
    RED = '#EF4444',
    BLUE = '#3B82F6',
    GREEN = '#10B981',
    YELLOW = '#FBBF24',
    ORANGE = '#F97316',
    WHITE = '#F3F4F6',
    BLACK = '#1F2937',
    GREY = '#9CA3AF',
}

export interface BrickType {
    label: string;
    sizeX: number;
    sizeZ: number;
    specialType?: 'AXLE' | 'TIRE';
}
