'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Trash2, Tag, Calendar, LayoutGrid, AlertCircle } from 'lucide-react';
import { LABEL_CONFIG } from '../mockData';
import type { Card } from '../types';

interface CardDetailModalProps {
  card: Card;
  columnTitle: string;
  onSave: (cardId: string, updates: Partial<Card>) => void;
  onClose: () => void;
  onDelete: (cardId: string) => void;
}

interface FormValues {
  title: string;
  description: string;
  label: string;
  dueDate: string;
}

function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function CardDetailModal({
  card,
  columnTitle,
  onSave,
  onClose,
  onDelete,
}: CardDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: card.title,
      description: card.description ?? '',
      label: card.label ?? '',
      dueDate: card.dueDate ?? '',
    },
  });

  useEffect(() => {
    reset({
      title: card.title,
      description: card.description ?? '',
      label: card.label ?? '',
      dueDate: card.dueDate ?? '',
    });
  }, [card.id, card.title, card.description, card.label, card.dueDate, reset]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const onSubmit = (data: FormValues) => {
    onSave(card.id, {
      title: data.title.trim(),
      description: data.description.trim(),
      label: (data.label as Card['label']) || null,
      dueDate: data.dueDate || null,
    });
  };

  const watchedDueDate = watch('dueDate');

  // Hydration-safe: compute overdue only on the client after mount
  const [overdue, setOverdue] = useState(false);
  useEffect(() => {
    setOverdue(isOverdue(watchedDueDate));
  }, [watchedDueDate]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-150"
        style={{ maxHeight: 'calc(100vh - 64px)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Edit card"
      >
        {/* Modal header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <LayoutGrid size={12} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{columnTitle}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Card ID: <span className="font-mono text-slate-500 dark:text-slate-400">{card.id}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-150"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Title field */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Card Title <span className="text-red-500">*</span>
              </label>
              <input
                {...register('title', {
                  required: 'Card title is required',
                  minLength: { value: 2, message: 'Title must be at least 2 characters' },
                  maxLength: { value: 200, message: 'Title must be under 200 characters' },
                })}
                className={`
                  w-full text-sm text-slate-800 dark:text-slate-100 border rounded-lg px-3 py-2.5 outline-none transition-all bg-white dark:bg-slate-700
                  ${errors.title
                    ? 'border-red-300 focus:ring-2 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-800 focus:border-indigo-400 dark:focus:border-indigo-500'
                  }
                `}
                placeholder="What needs to be done?"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description field */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Description
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">Add context, links, or acceptance criteria for this task.</p>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-800 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all resize-none placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Add a more detailed description…"
              />
            </div>

            {/* Label + Due date row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                  <span className="flex items-center gap-1"><Tag size={11} /> Label</span>
                </label>
                <select
                  {...register('label')}
                  className="w-full text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-800 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all bg-white dark:bg-slate-700"
                >
                  <option value="">No label</option>
                  {Object.entries(LABEL_CONFIG).map(([key, cfg]) => (
                    <option key={`label-opt-${key}`} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                  <span className="flex items-center gap-1"><Calendar size={11} /> Due Date</span>
                </label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className={`
                    w-full text-sm border rounded-lg px-3 py-2.5 outline-none focus:ring-2 transition-all
                    ${overdue && watchedDueDate
                      ? 'border-red-300 text-red-600 focus:ring-red-100 focus:border-red-400 bg-white dark:bg-slate-700' : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 focus:ring-indigo-100 dark:focus:ring-indigo-800 focus:border-indigo-400 dark:focus:border-indigo-500 bg-white dark:bg-slate-700'
                    }
                  `}
                />
                {overdue && watchedDueDate && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={10} />
                    This card is overdue
                  </p>
                )}
              </div>
            </div>

            {isDirty && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl">
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-150"
            >
              <Trash2 size={13} />
              Delete card
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150
                  ${isSubmitting || !isDirty
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white shadow-sm'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}