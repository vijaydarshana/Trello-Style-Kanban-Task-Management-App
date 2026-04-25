import React from 'react';

function ColumnSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex flex-col w-72 flex-shrink-0 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm p-3 gap-2.5">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pb-1">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse flex-1" />
        <div className="w-6 h-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
      </div>
      {/* Cards */}
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={`skel-card-${i}`} className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-14 bg-slate-100 dark:bg-slate-600 rounded-full animate-pulse" />
          </div>
          <div className="h-3.5 bg-slate-100 dark:bg-slate-600 rounded animate-pulse w-full" />
          <div className="h-3.5 bg-slate-100 dark:bg-slate-600 rounded animate-pulse w-4/5" />
        </div>
      ))}
      {/* Add card button */}
      <div className="h-7 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg animate-pulse mt-1" />
    </div>
  );
}

export default function BoardSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Topbar skeleton */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 gap-4">
        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        <div className="w-40 h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
      {/* Board skeleton */}
      <div className="flex gap-4 px-6 py-5 overflow-hidden">
        <ColumnSkeleton cardCount={4} />
        <ColumnSkeleton cardCount={3} />
        <ColumnSkeleton cardCount={2} />
        <ColumnSkeleton cardCount={3} />
      </div>
    </div>
  );
}