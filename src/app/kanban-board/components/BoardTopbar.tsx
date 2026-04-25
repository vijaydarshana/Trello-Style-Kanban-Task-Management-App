'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Search, RefreshCw, CheckSquare, X, Sun, Moon, Plus, ChevronDown, Pencil, Trash2, Undo2, Redo2 } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiBoard } from '@/contexts/MultiBoardContext';
import type { Board, Card } from '../types';

interface BoardTopbarProps {
  board: Board;
  cards: Card[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function BoardTopbar({ board, cards, searchQuery, onSearchChange, canUndo, canRedo, onUndo, onRedo }: BoardTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const boardMenuRef = useRef<HTMLDivElement>(null);
  const newBoardInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { boards, activeBoardId, setActiveBoardId, addBoard, renameBoard, deleteBoard } = useMultiBoard();

  const totalCards = cards.length;
  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);
  const doneColumnId = sortedColumns[sortedColumns.length - 1]?.id ?? '';
  const inProgressColumnId = sortedColumns[sortedColumns.length - 2]?.id ?? '';
  const inProgressCount = cards.filter(c => c.columnId === inProgressColumnId).length;
  const doneCount = cards.filter(c => c.columnId === doneColumnId).length;

  // Close board menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        setBoardMenuOpen(false);
        setAddingBoard(false);
        setRenamingBoardId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (addingBoard) newBoardInputRef.current?.focus();
  }, [addingBoard]);

  useEffect(() => {
    if (renamingBoardId) renameInputRef.current?.focus();
  }, [renamingBoardId]);

  const handleAddBoard = () => {
    const title = newBoardTitle.trim();
    if (!title) return;
    addBoard(title);
    setNewBoardTitle('');
    setAddingBoard(false);
    setBoardMenuOpen(false);
  };

  const handleRenameBoard = (id: string) => {
    const title = renameValue.trim();
    if (title) renameBoard(id, title);
    setRenamingBoardId(null);
  };

  const handleDeleteBoard = (id: string) => {
    deleteBoard(id);
    setBoardMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between px-6 py-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 z-20">
      {/* Left: Logo + Board switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-[15px] tracking-tight hidden sm:block">
            KanbanBoard
          </span>
        </div>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Board switcher dropdown */}
        <div className="relative" ref={boardMenuRef}>
          <button
            onClick={() => setBoardMenuOpen(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 max-w-[220px]"
          >
            <LayoutGrid size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {board.title}
            </span>
            <ChevronDown size={13} className={`text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform ${boardMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {boardMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Your Boards</p>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {boards.map(b => (
                  <div key={b.id} className="group flex items-center gap-1 px-2 py-0.5">
                    {renamingBoardId === b.id ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameBoard(b.id);
                          if (e.key === 'Escape') setRenamingBoardId(null);
                        }}
                        onBlur={() => handleRenameBoard(b.id)}
                        className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
                      />
                    ) : (
                      <button
                        onClick={() => { setActiveBoardId(b.id); setBoardMenuOpen(false); }}
                        className={`flex-1 text-left text-sm px-2 py-1.5 rounded-lg transition-all duration-100 truncate ${
                          b.id === activeBoardId
                            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-semibold' :'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {b.title}
                      </button>
                    )}
                    {renamingBoardId !== b.id && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setRenamingBoardId(b.id); setRenameValue(b.title); }}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Rename board"
                        >
                          <Pencil size={11} />
                        </button>
                        {boards.length > 1 && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteBoard(b.id); }}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Delete board"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 p-2">
                {addingBoard ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={newBoardInputRef}
                      value={newBoardTitle}
                      onChange={e => setNewBoardTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddBoard();
                        if (e.key === 'Escape') { setAddingBoard(false); setNewBoardTitle(''); }
                      }}
                      placeholder="Board name…"
                      className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-700"
                    />
                    <button
                      onClick={handleAddBoard}
                      disabled={!newBoardTitle.trim()}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg transition-all"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingBoard(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-lg transition-all"
                  >
                    <Plus size={13} />
                    New board
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: stats */}
      <div className="hidden md:flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <CheckSquare size={13} className="text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-tabular">
            {totalCards} cards
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-tabular">
            {inProgressCount} in progress
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 font-tabular">
            {doneCount} done
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {searchOpen ? (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-56 transition-all">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search cards…"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
              className="bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none w-full"
            />
            {searchQuery && (
              <button
                onMouseDown={e => { e.preventDefault(); onSearchChange(''); setSearchOpen(false); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150"
            title="Search cards"
          >
            <Search size={15} />
          </button>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150"
          title="Reload board"
        >
          <RefreshCw size={15} />
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          A
        </div>
      </div>
    </header>
  );
}