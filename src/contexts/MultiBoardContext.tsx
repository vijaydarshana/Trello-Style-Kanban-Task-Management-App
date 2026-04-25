'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Board } from '@/app/kanban-board/types';
import { DEFAULT_BOARD } from '@/app/kanban-board/mockData';

const LS_BOARDS_KEY = 'kanban_boards_v1';
const LS_ACTIVE_KEY = 'kanban_active_board_v1';

function readBoards(): Board[] | null {
  try {
    const raw = localStorage.getItem(LS_BOARDS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Board[];
  } catch {
    return null;
  }
}

function writeBoards(boards: Board[]): void {
  try {
    localStorage.setItem(LS_BOARDS_KEY, JSON.stringify(boards));
  } catch {}
}

interface MultiBoardContextValue {
  boards: Board[];
  activeBoardId: string;
  setActiveBoardId: (id: string) => void;
  addBoard: (title: string) => void;
  renameBoard: (id: string, title: string) => void;
  deleteBoard: (id: string) => void;
  updateBoard: (board: Board) => void;
  isHydrated: boolean;
}

const MultiBoardContext = createContext<MultiBoardContextValue>({
  boards: [],
  activeBoardId: '',
  setActiveBoardId: () => {},
  addBoard: () => {},
  renameBoard: () => {},
  deleteBoard: () => {},
  updateBoard: () => {},
  isHydrated: false,
});

export function MultiBoardProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState<Board[]>([DEFAULT_BOARD]);
  const [activeBoardId, setActiveBoardIdState] = useState<string>(DEFAULT_BOARD.id);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = readBoards();
    const storedActive = localStorage.getItem(LS_ACTIVE_KEY);
    if (stored && stored.length > 0) {
      setBoards(stored);
      const validActive = stored.find(b => b.id === storedActive) ? storedActive! : stored[0].id;
      setActiveBoardIdState(validActive);
    } else {
      // Migrate from old single-board localStorage key
      try {
        const oldRaw = localStorage.getItem('kanban_board_v1');
        if (oldRaw) {
          const oldBoard = JSON.parse(oldRaw) as Board;
          const migrated = [oldBoard];
          setBoards(migrated);
          setActiveBoardIdState(oldBoard.id);
          writeBoards(migrated);
        } else {
          writeBoards([DEFAULT_BOARD]);
        }
      } catch {
        writeBoards([DEFAULT_BOARD]);
      }
    }
    setIsHydrated(true);
  }, []);

  const persist = useCallback((updater: (b: Board[]) => Board[]) => {
    setBoards(prev => {
      const next = updater(prev);
      writeBoards(next);
      return next;
    });
  }, []);

  const setActiveBoardId = useCallback((id: string) => {
    setActiveBoardIdState(id);
    localStorage.setItem(LS_ACTIVE_KEY, id);
  }, []);

  const addBoard = useCallback((title: string) => {
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      title,
      columns: [
        { id: `col-${Date.now()}-1`, title: 'To Do', order: 0, color: '#6366f1' },
        { id: `col-${Date.now()}-2`, title: 'In Progress', order: 1, color: '#f59e0b' },
        { id: `col-${Date.now()}-3`, title: 'Done', order: 2, color: '#10b981' },
      ],
      cards: [],
    };
    persist(prev => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
  }, [persist, setActiveBoardId]);

  const renameBoard = useCallback((id: string, title: string) => {
    persist(prev => prev.map(b => b.id === id ? { ...b, title } : b));
  }, [persist]);

  const deleteBoard = useCallback((id: string) => {
    persist(prev => {
      const next = prev.filter(b => b.id !== id);
      if (next.length === 0) {
        const fallback = { ...DEFAULT_BOARD, id: `board-${Date.now()}` };
        setActiveBoardIdState(fallback.id);
        localStorage.setItem(LS_ACTIVE_KEY, fallback.id);
        return [fallback];
      }
      return next;
    });
    setBoards(prev => {
      const remaining = prev.filter(b => b.id !== id);
      if (remaining.length > 0 && activeBoardId === id) {
        setActiveBoardId(remaining[0].id);
      }
      return remaining;
    });
  }, [persist, activeBoardId, setActiveBoardId]);

  const updateBoard = useCallback((board: Board) => {
    persist(prev => prev.map(b => b.id === board.id ? board : b));
  }, [persist]);

  return (
    <MultiBoardContext.Provider value={{
      boards,
      activeBoardId,
      setActiveBoardId,
      addBoard,
      renameBoard,
      deleteBoard,
      updateBoard,
      isHydrated,
    }}>
      {children}
    </MultiBoardContext.Provider>
  );
}

export function useMultiBoard() {
  return useContext(MultiBoardContext);
}
