import { useState, useCallback, useEffect } from 'react';
import { BrickData } from '../types';

export const useHistory = (initialBricks: BrickData[] = []) => {
    const [bricks, setBricks] = useState<BrickData[]>(initialBricks);
    const [history, setHistory] = useState<BrickData[][]>([initialBricks]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

    const saveToHistory = useCallback((newBricks: BrickData[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, currentHistoryIndex + 1);
            newHistory.push(newBricks);
            return newHistory;
        });
        setCurrentHistoryIndex(prev => prev + 1);
        setBricks(newBricks);
    }, [currentHistoryIndex]);

    const undo = useCallback(() => {
        if (currentHistoryIndex > 0) {
            const newIndex = currentHistoryIndex - 1;
            setCurrentHistoryIndex(newIndex);
            if (history[newIndex]) {
                setBricks(history[newIndex]);
            }
        }
    }, [history, currentHistoryIndex]);

    const redo = useCallback(() => {
        if (currentHistoryIndex < history.length - 1) {
            const newIndex = currentHistoryIndex + 1;
            setCurrentHistoryIndex(newIndex);
            if (history[newIndex]) {
                setBricks(history[newIndex]);
            }
        }
    }, [history, currentHistoryIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                    e.preventDefault();
                } else if (e.key.toLowerCase() === 'y') {
                    redo();
                    e.preventDefault();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return {
        bricks,
        setBricks,
        saveToHistory,
        undo,
        redo,
        canUndo: currentHistoryIndex > 0,
        canRedo: currentHistoryIndex < history.length - 1
    };
};
