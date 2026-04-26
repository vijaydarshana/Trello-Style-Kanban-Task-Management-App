'use client';

import React, { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, AlignLeft, Calendar, AlertCircle } from 'lucide-react';
import { LABEL_CONFIG } from '../mockData';
import type { Card } from '../types';

interface CardItemProps {
  card: Card;
  index: number;
  onCardClick: (card: Card) => void;
  onDeleteRequest: (cardId: string) => void;
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CardItem({
  card,
  index,
  onCardClick,
  onDeleteRequest,
}: CardItemProps) {
  const [overdue, setOverdue] = useState(false);
  useEffect(() => {
    if (!card.dueDate) {
      setOverdue(false);
      return;
    }
    setOverdue(new Date(card.dueDate) < new Date(new Date().toDateString()));
  }, [card.dueDate]);

  const labelConfig = card.label ? LABEL_CONFIG[card.label] : null;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            group relative bg-white dark:bg-slate-700 rounded-lg border transition-all duration-150 select-none
            ${snapshot.isDragging
              ? 'shadow-2xl border-indigo-300 dark:border-indigo-600 rotate-1 opacity-95'
              : 'border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500'
            }
          `}
        >
          <div className="p-3">
            {/* Label + drag handle row */}
            <div className="flex items-center justify-between mb-1.5 min-h-[18px]">
              {labelConfig ? (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${labelConfig.bg} ${labelConfig.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${labelConfig.dot}`} />
                  {labelConfig.label}
                </span>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); onDeleteRequest(card.id); }}
                  className="p-1 rounded text-slate-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-150"
                  title="Delete this card — this cannot be undone"
                >
                  <Trash2 size={11} />
                </button>
                <div
                  {...provided.dragHandleProps}
                  className="cursor-grab active:cursor-grabbing p-1 rounded text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-150 touch-none"
                  title="Drag to move card"
                >
                  <GripVertical size={11} />
                </div>
              </div>
            </div>

            {/* Card title */}
            <button
              onClick={() => onCardClick(card)}
              className="w-full text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 leading-snug transition-colors line-clamp-3"
            >
              {card.title}
            </button>

            {/* Footer: description indicator + due date */}
            {(card.description || card.dueDate) && (
              <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-600">
                {card.description && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <AlignLeft size={10} />
                    <span>Note</span>
                  </span>
                )}
                {card.dueDate && (
                  <span
                    className={`flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 ${
                      overdue
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-500' :'bg-slate-50 dark:bg-slate-600 text-slate-400 dark:text-slate-400'
                    }`}
                  >
                    {overdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
                    {formatDueDate(card.dueDate)}
                    {overdue && <span className="font-semibold">Overdue</span>}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}