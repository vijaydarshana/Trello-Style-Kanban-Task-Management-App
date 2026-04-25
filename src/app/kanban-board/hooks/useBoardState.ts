'use client';

import { useCallback } from 'react';
import type { Board, Column, Card } from '../types';
import { useMultiBoard } from '@/contexts/MultiBoardContext';
import { useUndoRedo } from './useUndoRedo';
import {
  createColumn,
  updateColumn,
  deleteColumn as apiDeleteColumn,
  reorderColumns as apiReorderColumns,
  createCard,
  updateCard as apiUpdateCard,
  deleteCard as apiDeleteCard,
  moveCard as apiMoveCard,
} from '../api/boardApi';

// ─── Silent Supabase sync helpers ─────────────────────────────────────────────
function silently<T>(promise: Promise<T>): void {
  promise.catch(() => {/* swallow */});
}

export function useBoardState() {
  const { boards, activeBoardId, updateBoard, isHydrated } = useMultiBoard();

  const board: Board = boards.find(b => b.id === activeBoardId) ?? boards[0] ?? {
    id: 'fallback',
    title: 'Board',
    columns: [],
    cards: [],
  };

  // ─── Internal setter that always persists via context ────────────────────────
  const persist = useCallback((updater: (b: Board) => Board) => {
    const current = boards.find(b => b.id === activeBoardId);
    if (!current) return;
    const next = updater(current);
    updateBoard(next);
  }, [boards, activeBoardId, updateBoard]);

  // ─── Undo/Redo ────────────────────────────────────────────────────────────────
  const { canUndo, canRedo, undo, redo, pushHistory } = useUndoRedo(
    board,
    (restoredBoard) => updateBoard(restoredBoard)
  );

  // Helper: snapshot current board before a mutation
  const persistWithHistory = useCallback((updater: (b: Board) => Board) => {
    const current = boards.find(b => b.id === activeBoardId);
    if (!current) return;
    // Snapshot BEFORE the change
    pushHistory(current);
    const next = updater(current);
    updateBoard(next);
  }, [boards, activeBoardId, updateBoard, pushHistory]);

  // ─── Column operations ────────────────────────────────────────────────────────

  const addColumn = useCallback((title: string) => {
    const colors = ['#6366f1', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#0ea5e9', '#f97316'];
    persistWithHistory(b => {
      const maxOrder = b.columns.reduce((m, c) => Math.max(m, c.order), -1);
      const colorIndex = b.columns.length % colors.length;
      const col: Column = {
        id: `col-${Date.now()}`,
        title,
        order: maxOrder + 1,
        color: colors[colorIndex],
      };
      const next = { ...b, columns: [...b.columns, col] };
      silently(createColumn(col, b.id));
      return next;
    });
  }, [persistWithHistory]);

  const renameColumn = useCallback((columnId: string, title: string) => {
    persistWithHistory(b => {
      const next = {
        ...b,
        columns: b.columns.map(c => c.id === columnId ? { ...c, title } : c),
      };
      silently(updateColumn(columnId, { title }));
      return next;
    });
  }, [persistWithHistory]);

  const deleteColumn = useCallback((columnId: string) => {
    persistWithHistory(b => {
      const next = {
        ...b,
        columns: b.columns.filter(c => c.id !== columnId),
        cards: b.cards.filter(card => card.columnId !== columnId),
      };
      silently(apiDeleteColumn(columnId));
      return next;
    });
  }, [persistWithHistory]);

  // ─── Card operations ──────────────────────────────────────────────────────────

  const addCard = useCallback((columnId: string, title: string) => {
    persistWithHistory(b => {
      const colCards = b.cards.filter(c => c.columnId === columnId);
      const maxOrder = colCards.reduce((m, c) => Math.max(m, c.order), -1);
      const card: Card = {
        id: `card-${Date.now()}`,
        columnId,
        title,
        description: '',
        order: maxOrder + 1,
        label: null,
        dueDate: null,
      };
      const next = { ...b, cards: [...b.cards, card] };
      silently(createCard(card));
      return next;
    });
  }, [persistWithHistory]);

  const updateCard = useCallback((cardId: string, updates: Partial<Card>) => {
    persistWithHistory(b => {
      const next = {
        ...b,
        cards: b.cards.map(c => c.id === cardId ? { ...c, ...updates } : c),
      };
      silently(apiUpdateCard(cardId, updates));
      return next;
    });
  }, [persistWithHistory]);

  const deleteCard = useCallback((cardId: string) => {
    persistWithHistory(b => {
      const next = { ...b, cards: b.cards.filter(c => c.id !== cardId) };
      silently(apiDeleteCard(cardId));
      return next;
    });
  }, [persistWithHistory]);

  // ─── Drag & drop ──────────────────────────────────────────────────────────────

  const moveCard = useCallback((
    cardId: string,
    targetColumnId: string,
    targetIndex: number
  ) => {
    persistWithHistory(b => {
      const card = b.cards.find(c => c.id === cardId);
      if (!card) return b;

      const withoutCard = b.cards.filter(c => c.id !== cardId);
      const targetCards = withoutCard
        .filter(c => c.columnId === targetColumnId)
        .sort((a, bCard) => a.order - bCard.order);

      targetCards.splice(targetIndex, 0, { ...card, columnId: targetColumnId });
      const reorderedTarget = targetCards.map((c, i) => ({ ...c, order: i }));

      let sourceCards = withoutCard.filter(c => c.columnId === card.columnId);
      if (card.columnId !== targetColumnId) {
        sourceCards = sourceCards
          .sort((a, bCard) => a.order - bCard.order)
          .map((c, i) => ({ ...c, order: i }));
      }

      const otherCards = withoutCard.filter(
        c => c.columnId !== targetColumnId && c.columnId !== card.columnId
      );

      const newCards = [...reorderedTarget, ...sourceCards, ...otherCards];
      const next = { ...b, cards: newCards };

      const affectedCards = [...reorderedTarget, ...sourceCards].map(c => ({
        id: c.id,
        columnId: c.columnId,
        order: c.order,
      }));
      silently(apiMoveCard(affectedCards));

      return next;
    });
  }, [persistWithHistory]);

  const reorderColumns = useCallback((orderedIds: string[]) => {
    persistWithHistory(b => {
      const newColumns = b.columns
        .map(col => ({ ...col, order: orderedIds.indexOf(col.id) }))
        .sort((a, bCol) => a.order - bCol.order);
      const next = { ...b, columns: newColumns };
      silently(apiReorderColumns(newColumns.map(c => ({ id: c.id, order: c.order }))));
      return next;
    });
  }, [persistWithHistory]);

  return {
    board,
    isHydrated,
    addColumn,
    renameColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderColumns,
    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,
  };
}
