'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Toaster, toast } from 'sonner';
import { useBoardState } from '../hooks/useBoardState';
import { useMultiBoard } from '@/contexts/MultiBoardContext';
import BoardTopbar from './BoardTopbar';
import KanbanColumn from './KanbanColumn';
import CardItem from './CardItem';
import AddColumnButton from './AddColumnButton';
import CardDetailModal from './CardDetailModal';
import ConfirmModal from './ConfirmModal';
import BoardSkeleton from './BoardSkeleton';
import type { Card } from '../types';

export default function KanbanBoardClient() {
  const {
    board,
    isLoading,
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
  } = useBoardState();

  const { isHydrated } = useMultiBoard();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag lock: prevents concurrent/fast-drag conflicts
  const isDraggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);
  const columnIds = sortedColumns.map(c => c.id);

  const getColumnCards = useCallback(
    (columnId: string) =>
      board.cards
        .filter(c => c.columnId === columnId)
        .sort((a, b) => a.order - b.order),
    [board.cards]
  );

  const getFilteredColumnCards = useCallback(
    (columnId: string) => {
      const cards = getColumnCards(columnId);
      if (!searchQuery.trim()) return cards;
      const q = searchQuery.toLowerCase();
      return cards.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q)
      );
    },
    [getColumnCards, searchQuery]
  );

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (isDraggingRef.current) return; // Block concurrent drags
    isDraggingRef.current = true;
    const card = board.cards.find(c => c.id === event.active.id);
    if (card) setActiveCard(card);
  }, [board.cards]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveCard(null);
    setOverId(null);
    isDraggingRef.current = false;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overIdStr = String(over.id);

    if (columnIds.includes(activeId) && columnIds.includes(overIdStr)) {
      const oldIndex = columnIds.indexOf(activeId);
      const newIndex = columnIds.indexOf(overIdStr);
      const reordered = arrayMove(columnIds, oldIndex, newIndex);
      const result = await reorderColumns(reordered);
      if (result.error) {
        toast.error(`Failed to reorder columns: ${result.error}`);
      }
      return;
    }

    const draggedCard = board.cards.find(c => c.id === activeId);
    if (!draggedCard) return;

    if (columnIds.includes(overIdStr)) {
      const targetCards = getColumnCards(overIdStr);
      const result = await moveCard(activeId, overIdStr, targetCards.length);
      if (result.error) {
        toast.error(`Failed to move card: ${result.error}`);
      } else {
        toast.success('Card moved');
      }
      return;
    }

    const overCard = board.cards.find(c => c.id === overIdStr);
    if (!overCard) return;

    const targetColumnId = overCard.columnId;
    const targetCards = getColumnCards(targetColumnId);
    const overIndex = targetCards.findIndex(c => c.id === overIdStr);

    const result = await moveCard(activeId, targetColumnId, overIndex);
    if (result.error) {
      toast.error(`Failed to move card: ${result.error}`);
    } else if (draggedCard.columnId !== targetColumnId) {
      toast.success('Card moved');
    }
  }, [board.cards, columnIds, getColumnCards, moveCard, reorderColumns]);

  const handleAddColumn = useCallback(async (title: string) => {
    const result = await addColumn(title);
    if (result.error) {
      toast.error(`Failed to create column: ${result.error}`);
    } else {
      toast.success(`Column "${title}" created`);
    }
  }, [addColumn]);

  const handleRenameColumn = useCallback(async (columnId: string, title: string) => {
    const result = await renameColumn(columnId, title);
    if (result.error) {
      toast.error(`Failed to rename column: ${result.error}`);
    }
  }, [renameColumn]);

  const handleDeleteColumnRequest = useCallback((columnId: string) => {
    setDeletingColumnId(columnId);
  }, []);

  const handleDeleteColumnConfirm = useCallback(async () => {
    if (!deletingColumnId) return;
    const col = board.columns.find(c => c.id === deletingColumnId);
    const cardCount = board.cards.filter(c => c.columnId === deletingColumnId).length;
    setDeletingColumnId(null);
    const result = await deleteColumn(deletingColumnId);
    if (result.error) {
      toast.error(`Failed to delete column: ${result.error}`);
    } else {
      toast.success(
        cardCount > 0
          ? `Column "${col?.title}" and ${cardCount} card${cardCount !== 1 ? 's' : ''} deleted`
          : `Column "${col?.title}" deleted`
      );
    }
  }, [deletingColumnId, board.columns, board.cards, deleteColumn]);

  const handleAddCard = useCallback(async (columnId: string, title: string) => {
    const result = await addCard(columnId, title);
    if (result.error) {
      toast.error(`Failed to add card: ${result.error}`);
    } else {
      toast.success('Card added');
    }
  }, [addCard]);

  const handleCardClick = useCallback((card: Card) => {
    setEditingCard(card);
  }, []);

  const handleCardSave = useCallback(async (cardId: string, updates: Partial<Card>) => {
    const result = await updateCard(cardId, updates);
    setEditingCard(null);
    if (result.error) {
      toast.error(`Failed to update card: ${result.error}`);
    } else {
      toast.success('Card updated');
    }
  }, [updateCard]);

  const handleDeleteCardRequest = useCallback((cardId: string) => {
    setDeletingCardId(cardId);
    setEditingCard(null);
  }, []);

  const handleDeleteCardConfirm = useCallback(async () => {
    if (!deletingCardId) return;
    const cardTitle = board.cards.find(c => c.id === deletingCardId)?.title;
    setDeletingCardId(null);
    const result = await deleteCard(deletingCardId);
    if (result.error) {
      toast.error(`Failed to delete card: ${result.error}`);
    } else {
      toast.success(`"${cardTitle}" deleted`);
    }
  }, [deletingCardId, board.cards, deleteCard]);

  const deletingColumn = board.columns.find(c => c.id === deletingColumnId);
  const deletingColumnCardCount = deletingColumnId
    ? board.cards.filter(c => c.columnId === deletingColumnId).length
    : 0;
  const deletingCardObj = board.cards.find(c => c.id === deletingCardId);

  // ─── Keyboard shortcuts for undo/redo ─────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canUndo) undo();
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  if (!isHydrated) return <BoardSkeleton />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
          },
        }}
      />

      {/* Sync progress bar — shown while any Supabase operation is in-flight */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 h-0.5 bg-indigo-500 transition-opacity duration-300 ${
          isLoading ? 'opacity-100' : 'opacity-0'
        }`}
        style={isLoading ? { animation: 'progress-indeterminate 1.4s ease-in-out infinite' } : {}}
        aria-hidden="true"
      />

      <BoardTopbar
        board={board}
        cards={board.cards}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 px-6 py-5 h-full items-start min-w-max">
              {sortedColumns.map(column => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={getFilteredColumnCards(column.id)}
                  isOver={overId === column.id}
                  isDraggingCard={!!activeCard}
                  onRename={handleRenameColumn}
                  onDeleteRequest={handleDeleteColumnRequest}
                  onAddCard={handleAddCard}
                  onCardClick={handleCardClick}
                  onDeleteCardRequest={handleDeleteCardRequest}
                  activeCardId={activeCard?.id ?? null}
                />
              ))}

              <AddColumnButton onAdd={handleAddColumn} />
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeCard ? (
              <div className="card-drag-overlay w-72 rotate-2 scale-105">
                <CardItem
                  card={activeCard}
                  isOverlay
                  onCardClick={() => {}}
                  onDeleteRequest={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {editingCard && (
        <CardDetailModal
          card={editingCard}
          columnTitle={board.columns.find(c => c.id === editingCard.columnId)?.title ?? ''}
          onSave={handleCardSave}
          onClose={() => setEditingCard(null)}
          onDelete={handleDeleteCardRequest}
        />
      )}

      {deletingColumnId && (
        <ConfirmModal
          title="Delete column?"
          message={
            deletingColumnCardCount > 0
              ? `"${deletingColumn?.title}" contains ${deletingColumnCardCount} card${deletingColumnCardCount !== 1 ? 's' : ''}. Deleting this column will permanently remove all its cards. This cannot be undone.`
              : `Are you sure you want to delete "${deletingColumn?.title}"? This cannot be undone.`
          }
          confirmLabel="Delete Column"
          variant="destructive"
          onConfirm={handleDeleteColumnConfirm}
          onCancel={() => setDeletingColumnId(null)}
        />
      )}

      {deletingCardId && (
        <ConfirmModal
          title="Delete card?"
          message={`"${deletingCardObj?.title}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete Card"
          variant="destructive"
          onConfirm={handleDeleteCardConfirm}
          onCancel={() => setDeletingCardId(null)}
        />
      )}
    </div>
  );
}