'use client';

import { useState, useCallback } from 'react';
import type { Board } from '../types';

const MAX_HISTORY = 50;

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushHistory: (board: Board) => void;
}

export function useUndoRedo(
  currentBoard: Board,
  onRestore: (board: Board) => void
): UndoRedoState {
  // past[0] is oldest, past[past.length-1] is most recent previous state
  const [past, setPast] = useState<Board[]>([]);
  const [future, setFuture] = useState<Board[]>([]);

  const pushHistory = useCallback((board: Board) => {
    setPast(prev => {
      const next = [...prev, board];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    // Any new action clears the redo stack
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast(prev => {
      if (prev.length === 0) return prev;
      const newPast = prev.slice(0, prev.length - 1);
      const previousBoard = prev[prev.length - 1];
      // Push current board to future
      setFuture(f => [currentBoard, ...f]);
      onRestore(previousBoard);
      return newPast;
    });
  }, [currentBoard, onRestore]);

  const redo = useCallback(() => {
    setFuture(prev => {
      if (prev.length === 0) return prev;
      const nextBoard = prev[0];
      const newFuture = prev.slice(1);
      // Push current board to past
      setPast(p => {
        const next = [...p, currentBoard];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });
      onRestore(nextBoard);
      return newFuture;
    });
  }, [currentBoard, onRestore]);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    pushHistory,
  };
}
