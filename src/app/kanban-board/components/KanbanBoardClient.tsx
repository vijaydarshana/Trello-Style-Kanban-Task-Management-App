'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Toaster, toast } from 'sonner';
import { useBoardState } from '../hooks/useBoardState';
import { useMultiBoard } from '@/contexts/MultiBoardContext';
import BoardTopbar from './BoardTopbar';
import KanbanColumn from './KanbanColumn';
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

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const boardRef = useRef(board);
  boardRef.current = board;

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);

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

  // ─── DnD handler ─────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, type } = result;

    // Dropped outside any droppable
    if (!destination) return;

    // No movement
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    const currentBoard = boardRef.current;

    // ── Column reorder ──────────────────────────────────────────────────────────
    if (type === 'COLUMN') {
      const cols = [...currentBoard.columns].sort((a, b) => a.order - b.order);
      const [moved] = cols.splice(source.index, 1);
      cols.splice(destination.index, 0, moved);
      const reorderedIds = cols.map(c => c.id);
      await reorderColumns(reorderedIds);
      return;
    }

    // ── Card move ───────────────────────────────────────────────────────────────
    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;

    await moveCard(result.draggableId, destColumnId, destination.index);
    if (sourceColumnId !== destColumnId) {
      toast.success('Card moved');
    }
  }, [moveCard, reorderColumns]);

  // ─── Column / Card action handlers ──────────────────────────────────────────

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
    const col = boardRef.current.columns.find(c => c.id === deletingColumnId);
    const cardCount = boardRef.current.cards.filter(c => c.columnId === deletingColumnId).length;
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
  }, [deletingColumnId, deleteColumn]);

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
    const cardTitle = boardRef.current.cards.find(c => c.id === deletingCardId)?.title;
    setDeletingCardId(null);
    const result = await deleteCard(deletingCardId);
    if (result.error) {
      toast.error(`Failed to delete card: ${result.error}`);
    } else {
      toast.success(`"${cardTitle}" deleted`);
    }
  }, [deletingCardId, deleteCard]);

  const deletingColumn = board.columns.find(c => c.id === deletingColumnId);
  const deletingColumnCardCount = deletingColumnId
    ? board.cards.filter(c => c.columnId === deletingColumnId).length
    : 0;
  const deletingCardObj = board.cards.find(c => c.id === deletingCardId);

  // ─── Keyboard shortcuts for undo/redo ────────────────────────────────────────
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

      {/* Sync progress bar */}
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="COLUMN" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 px-6 py-5 h-full items-start min-w-max"
              >
                {sortedColumns.map((column, index) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    index={index}
                    cards={getFilteredColumnCards(column.id)}
                    onRename={handleRenameColumn}
                    onDeleteRequest={handleDeleteColumnRequest}
                    onAddCard={handleAddCard}
                    onCardClick={handleCardClick}
                    onDeleteCardRequest={handleDeleteCardRequest}
                  />
                ))}
                {provided.placeholder}
                <AddColumnButton onAdd={handleAddColumn} />
              </div>
            )}
          </Droppable>
        </DragDropContext>
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