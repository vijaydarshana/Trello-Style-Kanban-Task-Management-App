'use client';

import { useCallback, useState, useRef } from 'react';
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

  // Always-current ref — prevents stale closures in async callbacks
  const boardsRef = useRef(boards);
  boardsRef.current = boards;
  const activeBoardIdRef = useRef(activeBoardId);
  activeBoardIdRef.current = activeBoardId;

  const board: Board = boards.find(b => b.id === activeBoardId) ?? boards[0] ?? {
    id: 'fallback',
    title: 'Board',
    columns: [],
    cards: [],
  };

  // ─── Undo/Redo ────────────────────────────────────────────────────────────────
  const { canUndo, canRedo, undo, redo, pushHistory } = useUndoRedo(
    board,
    (restoredBoard) => updateBoard(restoredBoard)
  );

  // ─── localStorage-first: apply immediately, sync to Supabase silently ────────
  // Changes are committed to localStorage instantly. Supabase is a background
  // mirror — failures are swallowed silently; localStorage state is never rolled back.
  const syncToSupabase = useCallback(
    async <T>(
      opKey: string,
      optimisticUpdater: (b: Board) => Board,
      apiCall: () => Promise<{ data: T | null; error: string | null }>
    ): Promise<{ error: string | null }> => {
      const current = boardsRef.current.find(b => b.id === activeBoardIdRef.current);
      if (!current) return { error: 'Board not found' };

      // 1. Commit to localStorage immediately (source of truth)
      pushHistory(current);
      const next = optimisticUpdater(current);
      updateBoard(next);

      // 2. Show sync indicator
      setPendingOps(prev => new Set(prev).add(opKey));

      // 3. Background sync to Supabase — silent, no rollback on failure
      try {
        await apiCall();
      } catch {
        // Supabase sync failed silently — localStorage state is preserved
      } finally {
        setPendingOps(prev => {
          const updated = new Set(prev);
          updated.delete(opKey);
          return updated;
        });
      }

      return { error: null };
    },
    [updateBoard, pushHistory]
  );

  // ─── Column operations ────────────────────────────────────────────────────────

  const addColumn = useCallback(async (
    title: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const colors = ['#6366f1', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#0ea5e9', '#f97316'];
    const current = boardsRef.current.find(b => b.id === activeBoardIdRef.current);
    if (!current) return { error: 'Board not found' };

    const maxOrder = current.columns.reduce((m, c) => Math.max(m, c.order), -1);
    const colorIndex = current.columns.length % colors.length;
    const col: Column = {
      id: `col-${Date.now()}`,
      title,
      order: maxOrder + 1,
      color: colors[colorIndex],
    };

    return syncToSupabase(
      `addColumn-${col.id}`,
      b => ({ ...b, columns: [...b.columns, col] }),
      () => createColumn(col, current.id)
    );
  }, [syncToSupabase]);

  const renameColumn = useCallback(async (
    columnId: string,
    title: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncToSupabase(
      `renameColumn-${columnId}`,
      b => ({ ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, title } : c) }),
      () => updateColumn(columnId, { title })
    );
  }, [syncToSupabase]);

  const deleteColumn = useCallback(async (
    columnId: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncToSupabase(
      `deleteColumn-${columnId}`,
      b => ({
        ...b,
        columns: b.columns.filter(c => c.id !== columnId),
        cards: b.cards.filter(card => card.columnId !== columnId),
      }),
      () => apiDeleteColumn(columnId)
    );
  }, [syncToSupabase]);

  // ─── Card operations ──────────────────────────────────────────────────────────

  const addCard = useCallback(async (
    columnId: string,
    title: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const current = boardsRef.current.find(b => b.id === activeBoardIdRef.current);
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

    return syncToSupabase(
      `addCard-${card.id}`,
      b => ({ ...b, cards: [...b.cards, card] }),
      () => createCard(card)
    );
  }, [syncToSupabase]);

  const updateCard = useCallback(async (
    cardId: string,
    updates: Partial<Card>,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncToSupabase(
      `updateCard-${cardId}`,
      b => ({ ...b, cards: b.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) }),
      () => apiUpdateCard(cardId, updates)
    );
  }, [syncToSupabase]);

  const deleteCard = useCallback(async (
    cardId: string,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    return syncToSupabase(
      `deleteCard-${cardId}`,
      b => ({ ...b, cards: b.cards.filter(c => c.id !== cardId) }),
      () => apiDeleteCard(cardId)
    );
  }, [syncToSupabase]);

  // ─── Drag & drop ──────────────────────────────────────────────────────────────

  const moveCard = useCallback(async (
    cardId: string,
    targetColumnId: string,
    targetIndex: number,
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const current = boardsRef.current.find(b => b.id === activeBoardIdRef.current);
    if (!current) return { error: 'Board not found' };

    const card = current.cards.find(c => c.id === cardId);
    if (!card) return { error: 'Card not found' };

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

    return syncToSupabase(
      `moveCard-${cardId}-${Date.now()}`,
      b => ({ ...b, cards: newCards }),
      () => apiMoveCard(affectedCards)
    );
  }, [syncToSupabase]);

  const reorderColumns = useCallback(async (
    orderedIds: string[],
    onError?: (err: string) => void
  ): Promise<{ error: string | null }> => {
    const current = boardsRef.current.find(b => b.id === activeBoardIdRef.current);
    if (!current) return { error: 'Board not found' };

    const newColumns = current.columns
      .map(col => ({ ...col, order: orderedIds.indexOf(col.id) }))
      .sort((a, b) => a.order - b.order);

    return syncToSupabase(
      `reorderColumns-${Date.now()}`,
      () => ({ ...current, columns: newColumns }),
      () => apiReorderColumns(newColumns.map(c => ({ id: c.id, order: c.order })))
    );
  }, [syncToSupabase]);

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
    canUndo,
    canRedo,
    undo,
    redo,
  };
}
