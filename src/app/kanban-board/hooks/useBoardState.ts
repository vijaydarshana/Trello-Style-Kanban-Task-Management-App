'use client';

import { useCallback, useState } from 'react';
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

export function useBoardState() {
  const { boards, activeBoardId, updateBoard, isHydrated } = useMultiBoard();
  const [pendingOps, setPendingOps] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

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
    pushHistory(current);
    const next = updater(current);
    updateBoard(next);
  }, [boards, activeBoardId, updateBoard, pushHistory]);

  // ─── Async sync with rollback on failure ─────────────────────────────────────
  const syncWithRollback = useCallback(
    async <T>(
      opKey: string,
      optimisticUpdater: (b: Board) => Board,
      apiCall: () => Promise<{ data: T | null; error: string | null }>,
      onError?: (err: string) => void
    ): Promise<{ error: string | null }> => {
      const current = boards.find(b => b.id === activeBoardId);
      if (!current) return { error: 'Board not found' };

      // Snapshot for rollback
      const snapshot = current;

      // Apply optimistic update
      pushHistory(current);
      const next = optimisticUpdater(current);
      updateBoard(next);

      // Mark operation as pending
      setPendingOps(prev => new Set(prev).add(opKey));

      try {
        const result = await apiCall();
        if (result.error) {
          // Rollback to snapshot
          updateBoard(snapshot);
          onError?.(result.error);
          return { error: result.error };
        }
        return { error: null };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Operation failed';
        updateBoard(snapshot);
        onError?.(msg);
        return { error: msg };
      } finally {
        setPendingOps(prev => {
          const next = new Set(prev);
          next.delete(opKey);
          return next;
        });
      }
    },
    [boards, activeBoardId, updateBoard, pushHistory]
  );

  // ─── Column operations ────────────────────────────────────────────────────────

  const addColumn = useCallback(async (
    title: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const colors = ['#6366f1', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#0ea5e9', '#f97316'];
    const current = boards.find(b => b.id === activeBoardId);
    if (!current) return { error: 'Board not found' };

    const maxOrder = current.columns.reduce((m, c) => Math.max(m, c.order), -1);
    const colorIndex = current.columns.length % colors.length;
    const col: Column = {
      id: `col-${Date.now()}`,
      title,
      order: maxOrder + 1,
      color: colors[colorIndex],
    };

    return syncWithRollback(
      `addColumn-${col.id}`,
      b => ({ ...b, columns: [...b.columns, col] }),
      () => createColumn(col, current.id),
      onError
    );
  }, [boards, activeBoardId, syncWithRollback]);

  const renameColumn = useCallback(async (
    columnId: string,
    title: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncWithRollback(
      `renameColumn-${columnId}`,
      b => ({ ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, title } : c) }),
      () => updateColumn(columnId, { title }),
      onError
    );
  }, [syncWithRollback]);

  const deleteColumn = useCallback(async (
    columnId: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncWithRollback(
      `deleteColumn-${columnId}`,
      b => ({
        ...b,
        columns: b.columns.filter(c => c.id !== columnId),
        cards: b.cards.filter(card => card.columnId !== columnId),
      }),
      () => apiDeleteColumn(columnId),
      onError
    );
  }, [syncWithRollback]);

  // ─── Card operations ──────────────────────────────────────────────────────────

  const addCard = useCallback(async (
    columnId: string,
    title: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const current = boards.find(b => b.id === activeBoardId);
    if (!current) return { error: 'Board not found' };

    const colCards = current.cards.filter(c => c.columnId === columnId);
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

    return syncWithRollback(
      `addCard-${card.id}`,
      b => ({ ...b, cards: [...b.cards, card] }),
      () => createCard(card),
      onError
    );
  }, [boards, activeBoardId, syncWithRollback]);

  const updateCard = useCallback(async (
    cardId: string,
    updates: Partial<Card>,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncWithRollback(
      `updateCard-${cardId}`,
      b => ({ ...b, cards: b.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) }),
      () => apiUpdateCard(cardId, updates),
      onError
    );
  }, [syncWithRollback]);

  const deleteCard = useCallback(async (
    cardId: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncWithRollback(
      `deleteCard-${cardId}`,
      b => ({ ...b, cards: b.cards.filter(c => c.id !== cardId) }),
      () => apiDeleteCard(cardId),
      onError
    );
  }, [syncWithRollback]);

  // ─── Drag & drop ──────────────────────────────────────────────────────────────

  const moveCard = useCallback(async (
    cardId: string,
    targetColumnId: string,
    targetIndex: number,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const current = boards.find(b => b.id === activeBoardId);
    if (!current) return { error: 'Board not found' };

    const card = current.cards.find(c => c.id === cardId);
    if (!card) return { error: 'Card not found' };

    // Pre-compute the affected cards for the API call
    const withoutCard = current.cards.filter(c => c.id !== cardId);
    const targetCards = withoutCard
      .filter(c => c.columnId === targetColumnId)
      .sort((a, b) => a.order - b.order);

    targetCards.splice(targetIndex, 0, { ...card, columnId: targetColumnId });
    const reorderedTarget = targetCards.map((c, i) => ({ ...c, order: i }));

    let sourceCards = withoutCard.filter(c => c.columnId === card.columnId);
    if (card.columnId !== targetColumnId) {
      sourceCards = sourceCards
        .sort((a, b) => a.order - b.order)
        .map((c, i) => ({ ...c, order: i }));
    }

    const otherCards = withoutCard.filter(
      c => c.columnId !== targetColumnId && c.columnId !== card.columnId
    );

    const newCards = [...reorderedTarget, ...sourceCards, ...otherCards];
    const affectedCards = [...reorderedTarget, ...sourceCards].map(c => ({
      id: c.id,
      columnId: c.columnId,
      order: c.order,
    }));

    return syncWithRollback(
      `moveCard-${cardId}-${Date.now()}`,
      b => ({ ...b, cards: newCards }),
      () => apiMoveCard(affectedCards),
      onError
    );
  }, [boards, activeBoardId, syncWithRollback]);

  const reorderColumns = useCallback(async (
    orderedIds: string[],
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const current = boards.find(b => b.id === activeBoardId);
    if (!current) return { error: 'Board not found' };

    const newColumns = current.columns
      .map(col => ({ ...col, order: orderedIds.indexOf(col.id) }))
      .sort((a, b) => a.order - b.order);

    return syncWithRollback(
      `reorderColumns-${Date.now()}`,
      () => ({ ...current, columns: newColumns }),
      () => apiReorderColumns(newColumns.map(c => ({ id: c.id, order: c.order }))),
      onError
    );
  }, [boards, activeBoardId, syncWithRollback]);

  const isLoading = pendingOps.size > 0;

  return {
    board,
    isHydrated,
    isLoading,
    isDragging,
    setIsDragging,
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
