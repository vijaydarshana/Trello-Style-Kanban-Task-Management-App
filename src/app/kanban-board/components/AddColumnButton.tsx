'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';

interface AddColumnButtonProps {
  onAdd: (title: string) => void;
}

export default function AddColumnButton({ onAdd }: AddColumnButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setIsOpen(false);
      setTitle('');
      return;
    }
    onAdd(trimmed);
    setTitle('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setIsOpen(false);
      setTitle('');
    }
  };

  if (isOpen) {
    return (
      <div className="flex flex-col w-72 flex-shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 gap-2.5 self-start">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">New Column</p>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Column title…"
          className="text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-semibold rounded-md transition-all duration-150"
          >
            <Check size={12} />
            Add column
          </button>
          <button
            onClick={() => { setIsOpen(false); setTitle(''); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-all duration-150"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="
        flex items-center gap-2 w-64 flex-shrink-0 self-start
        px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700
        text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20
        text-sm font-medium transition-all duration-200 group
      "
    >
      <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
      Add column
    </button>
  );
}