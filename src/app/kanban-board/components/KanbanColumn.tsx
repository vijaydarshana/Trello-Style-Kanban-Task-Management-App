'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import CardItem from './CardItem';
import type { Column, Card } from '../types';

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  isOver: boolean;
  isDraggingCard: boolean;
  onRename: (columnId: string, title: string) => void;
  onDeleteRequest: (columnId: string) => void;
  onAddCard: (columnId: string, title: string) => void;
  onCardClick: (card: Card) => void;
  onDeleteCardRequest: (cardId: string) => void;
  activeCardId: string | null;
}

function DroppableColumnBody({ columnId, children }: { columnId: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: columnId });
  return <div ref={setNodeRef} className="flex-1 min-h-[4px]">{children}</div>;
}

export default function KanbanColumn({
  column,
  cards,
  isOver,
  isDraggingCard,
  onRename,
  onDeleteRequest,
  onAddCard,
  onCardClick,
  onDeleteCardRequest,
  activeCardId,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showDeleteHint, setShowDeleteHint] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const addCardInputRef = useRef<HTMLTextAreaElement>(null);

  // Sync local title state when the column prop is updated externally (e.g. after a successful rename)
  useEffect(() => {
    setTitleValue(column.title);
  }, [column.title]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isAddingCard && addCardInputRef.current) {
      addCardInputRef.current.focus();
    }
  }, [isAddingCard]);

  const handleTitleSave = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== column.title) {
      onRename(column.id, trimmed);
    } else {
      setTitleValue(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') {
      setTitleValue(column.title);
      setIsEditingTitle(false);
    }
  };

  const handleAddCard = () => {
    const trimmed = newCardTitle.trim();
    if (!trimmed) {
      setIsAddingCard(false);
      setNewCardTitle('');
      return;
    }
    onAddCard(column.id, trimmed);
    setNewCardTitle('');
    setIsAddingCard(false);
  };

  const handleAddCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCard();
    }
    if (e.key === 'Escape') {
      setIsAddingCard(false);
      setNewCardTitle('');
    }
  };

  const cardIds = cards.map(c => c.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex flex-col w-72 flex-shrink-0 rounded-xl border transition-all duration-200
        ${isOver && isDraggingCard
          ? 'bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600 shadow-md'
          : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 shadow-sm'
        }
        ${isDragging ? 'shadow-2xl z-50' : ''}
        max-h-[calc(100vh-88px)]
      `}
    >
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 pt-3 pb-2 group"
        onMouseEnter={() => setShowDeleteHint(true)}
        onMouseLeave={() => setShowDeleteHint(false)}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 touch-none"
          title="Drag to reorder column"
        >
          <GripVertical size={14} />
        </button>

        {/* Color dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: column.color }}
        />

        {/* Title */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 border border-indigo-300 dark:border-indigo-600 rounded-md px-2 py-0.5 outline-none ring-1 ring-indigo-200 dark:ring-indigo-700 min-w-0"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex-1 text-left text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate min-w-0"
            title="Click to rename column"
          >
            {column.title}
          </button>
        )}

        {/* Card count */}
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5 font-tabular flex-shrink-0">
          {cards.length}
        </span>

        {/* Delete column */}
        <button
          onClick={() => onDeleteRequest(column.id)}
          className={`flex-shrink-0 p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-150 ${showDeleteHint ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          title="Delete this column — this cannot be undone"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-1 min-h-[4px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <DroppableColumnBody columnId={column.id}>
            <div className="flex flex-col gap-2 pb-1">
              {cards.length === 0 && !isAddingCard ? (
                <div
                  className={`
                    flex items-center justify-center h-16 rounded-lg border-2 border-dashed transition-all duration-200
                    ${isOver && isDraggingCard
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/20 text-indigo-400' :'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                    }
                  `}
                >
                  <span className="text-xs font-medium">
                    {isOver && isDraggingCard ? 'Drop here' : 'No cards yet'}
                  </span>
                </div>
              ) : (
                cards.map(card => (
                  <CardItem
                    key={card.id}
                    card={card}
                    isOverlay={false}
                    isActive={activeCardId === card.id}
                    onCardClick={onCardClick}
                    onDeleteRequest={onDeleteCardRequest}
                  />
                ))
              )}
            </div>
          </DroppableColumnBody>
        </SortableContext>
      </div>

      {/* Add card section */}
      <div className="px-2.5 pb-2.5 pt-1">
        {isAddingCard ? (
          <div className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm p-2 flex flex-col gap-2">
            <textarea
              ref={addCardInputRef}
              value={newCardTitle}
              onChange={e => setNewCardTitle(e.target.value)}
              onKeyDown={handleAddCardKeyDown}
              placeholder="Enter a card title…"
              rows={2}
              className="text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none resize-none w-full bg-transparent"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAddCard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-semibold rounded-md transition-all duration-150"
              >
                <Check size={12} />
                Add card
              </button>
              <button
                onClick={() => { setIsAddingCard(false); setNewCardTitle(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-md transition-all duration-150"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCard(true)}
            className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-white/70 dark:hover:bg-slate-700/70 text-xs font-medium transition-all duration-150 group"
          >
            <Plus size={13} className="group-hover:rotate-90 transition-transform duration-200" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}