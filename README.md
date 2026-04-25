# KanbanBoard

A single-board Kanban application built with **Next.js 15**, **TypeScript**, and **Supabase** (PostgreSQL). Drag cards between columns, manage tasks with labels and due dates, and search across all cards in real time — all changes persist to the database.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Drag & drop** | Cards and columns are sortable via `@dnd-kit`. Positions persist to Supabase on every drop. |
| **Optimistic UI** | Every mutation updates the UI immediately and rolls back with a toast on failure. |
| **Card detail modal** | Edit title, description, label (Bug / Feature / Improvement / Chore), and due date with form validation. |
| **Column management** | Add, rename, and delete columns. Deleting a column cascades to its cards (DB + UI). |
| **Real-time search** | Filter cards by title or description across all columns as you type. |
| **Overdue indicators** | Cards past their due date show a red "Overdue" badge. |
| **Loading skeleton** | Board renders a skeleton while the initial Supabase fetch completes. |
| **Toast notifications** | Success and error feedback via `sonner` for every operation. |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 |
| Database | Supabase (PostgreSQL) |
| Supabase client | `@supabase/ssr` |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Forms | `react-hook-form` |
| Toasts | `sonner` |
| Icons | `lucide-react` |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── kanban-board/
│   │   ├── page.tsx                  # Route entry point (Server Component)
│   │   ├── types.ts                  # Board, Column, Card interfaces
│   │   ├── mockData.ts               # DEFAULT_BOARD fallback + LABEL_CONFIG
│   │   ├── api/
│   │   │   └── boardApi.ts           # All Supabase CRUD functions
│   │   ├── hooks/
│   │   │   └── useBoardState.ts      # State + optimistic mutation logic
│   │   └── components/
│   │       ├── KanbanBoardClient.tsx # Root client component, DnD context
│   │       ├── KanbanColumn.tsx      # Sortable column with droppable body
│   │       ├── CardItem.tsx          # Sortable card
│   │       ├── CardDetailModal.tsx   # Edit card modal (react-hook-form)
│   │       ├── BoardTopbar.tsx       # Header with search and stats
│   │       ├── AddColumnButton.tsx   # Inline column creation
│   │       ├── ConfirmModal.tsx      # Reusable destructive-action dialog
│   │       └── BoardSkeleton.tsx     # Loading skeleton
│   └── layout.tsx
├── lib/
│   └── supabase/
│       └── client.ts                 # createClient() with cookie/localStorage fallback
└── contexts/
    └── AuthContext.tsx
supabase/
└── migrations/
    └── 20260424104009_kanban_board.sql  # Schema + seed data
```

---

## ⚙️ Environment Variables

Create a `.env.local` file at the project root:



---

## 🚀 Setup & Run

### Prerequisites

- Node.js ≥ 18
- A Supabase project (free tier is sufficient)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Apply the database migration
# Option A — Supabase CLI
npx supabase db push

# Option B — Supabase Dashboard
# Open SQL Editor and paste the contents of:
# supabase/migrations/20260424104009_kanban_board.sql

# 4. Start the development server
npm run dev
```

Open [http://localhost:4028](http://localhost:4028) to see the board.

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server on port 4028 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier format |

---

## 🔧 Detailed Setup Guide

### 1 — Clone & Install

```bash
git clone <your-repo-url>
cd kanban-board
npm install
```

All runtime and dev dependencies (Next.js, Supabase client, dnd-kit, react-hook-form, sonner, Tailwind CSS, etc.) are declared in `package.json` and installed in one step.

---

### 2 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New project**, choose a name and a strong database password, then click **Create new project**.
3. Wait ~2 minutes for the project to provision.
4. Navigate to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 3 — Configure Environment Variables

Create a `.env.local` file at the project root (never commit this file):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> **Tip**: The `.env` file already exists in this repo with placeholder values. Rename it to `.env.local` or create a new `.env.local` that overrides it — Next.js loads `.env.local` last and it takes precedence.

---

### 4 — Apply the Database Migration

The full schema (tables, indexes, RLS policies, and seed data) lives in a single migration file:

```
supabase/migrations/20260424104009_kanban_board.sql
```

**Option A — Supabase CLI (recommended)**

```bash
# Install the CLI if you haven't already
npm install -g supabase

# Link to your remote project (you'll be prompted for your project ref and DB password)
npx supabase link --project-ref <your-project-ref>

# Push the migration
npx supabase db push
```

**Option B — Supabase Dashboard SQL Editor**

1. Open your project in the Supabase dashboard.
2. Go to **SQL Editor → New query**.
3. Paste the entire contents of `supabase/migrations/20260424104009_kanban_board.sql`.
4. Click **Run**.

After the migration runs you should see three tables in **Table Editor**: `boards`, `columns`, and `cards`, pre-seeded with the default board and three starter columns.

---

### 5 — Start the Development Server

```bash
npm run dev
```

Visit [http://localhost:4028](http://localhost:4028). The board loads the seed data from Supabase on first render.

live Link : https://trello-style-kanban-task-management.vercel.app/kanban-board

---

### 6 — Production Build

```bash
npm run build   # type-check + compile
npm run start   # serve the compiled output
```

For deployment, set the two `NEXT_PUBLIC_*` environment variables in your hosting provider's dashboard (Vercel, Netlify, Railway, etc.) — no other configuration is required.

---

## 🏗 Architecture

### High-Level Overview

```
Browser
  └── Next.js App Router (React 19)
        ├── Server Component  →  page.tsx          (initial data fetch)
        └── Client Component  →  KanbanBoardClient  (all interactivity)
              ├── DnD Context  (@dnd-kit)
              ├── useBoardState hook  (state + optimistic mutations)
              │     └── boardApi.ts  (Supabase CRUD)
              │           └── Supabase JS client  →  PostgreSQL (Supabase)
              └── UI Components
                    ├── KanbanColumn  (sortable column)
                    ├── CardItem      (sortable card)
                    ├── CardDetailModal
                    ├── BoardTopbar
                    ├── AddColumnButton
                    └── ConfirmModal
```

---

### Layer Responsibilities

#### `page.tsx` — Server Component (Route Entry Point)
- Runs on the server; performs the initial Supabase fetch using the service-role-safe `createClient()`.
- Passes the serialized board snapshot to `KanbanBoardClient` as a prop.
- Keeps the route boundary clean: zero client-side JavaScript is shipped for this file.

#### `KanbanBoardClient.tsx` — Root Client Component
- Owns the `DndContext` and `SortableContext` from `@dnd-kit`.
- Handles `onDragEnd` events and delegates to `useBoardState` for state updates.
- Renders the column list, topbar, modals, and the add-column button.
- Manages the hydration guard (`isHydrated` flag) to prevent server/client HTML mismatches.

#### `hooks/useBoardState.ts` — State & Optimistic Mutation Layer
- Single source of truth for the in-memory board (`Board` object).
- Every mutation follows the **optimistic update pattern**:
  1. Apply the change to local state immediately (instant UI feedback).
  2. Fire the async Supabase call in the background.
  3. On failure: roll back to the previous snapshot and show an error toast.
- Exposes stable callbacks (`addCard`, `moveCard`, `deleteColumn`, etc.) consumed by child components.
- Wraps `useUndoRedo` to maintain a history stack for Ctrl+Z / Ctrl+Y.

#### `api/boardApi.ts` — Data Access Layer
- Pure async functions; no React, no state.
- Each function returns `ApiResult<T>` (`{ data, error }`) for consistent error handling.
- Handles snake_case ↔ camelCase conversion via `dbColToColumn` / `dbCardToCard` mappers.
- Batch reorders use `Promise.all` over individual `UPDATE` statements (see Trade-offs).

#### `lib/supabase/client.ts` — Supabase Client Factory
- Creates a single `SupabaseClient` instance using `@supabase/ssr`.
- Falls back to `localStorage` when cookies are unavailable (pure client-side context).

#### `contexts/MultiBoardContext.tsx` — Multi-Board Registry
- Maintains a list of known board IDs in `localStorage`.
- Currently the app only uses `board-001`, but the context is wired up for future multi-board support without requiring a schema change.

#### `contexts/ThemeContext.tsx` — Theme Provider
- Manages `light` / `dark` mode preference, persisted to `localStorage`.
- Applies the `dark` class to `<html>` so Tailwind's `dark:` variants work globally.

---

### Data Flow — Card Move (Drag & Drop)

```
User drops card onto new column
        │
        ▼
KanbanBoardClient.onDragEnd()
        │  identifies source column, destination column, new index
        ▼
useBoardState.moveCard(cardId, fromColId, toColId, newIndex)
        │
        ├─ 1. Snapshot current board state
        ├─ 2. Compute new card_order values for affected columns
        ├─ 3. setState(newBoard)          ← UI updates instantly
        │
        └─ 4. boardApi.apiMoveCard(...)   ← async Supabase call
                  │
                  ├─ SUCCESS → no-op (UI already correct)
                  └─ FAILURE → setState(snapshot) + toast.error(...)
```

---

### Component Tree

```
KanbanBoardClient
├── BoardTopbar
│     └── search input, stats counters, theme toggle, undo/redo buttons
├── DndContext
│   └── SortableContext (columns)
│         └── KanbanColumn[]
│               ├── column header (title, color dot, action menu)
│               ├── SortableContext (cards)
│               │     └── CardItem[]
│               │           └── overdue badge, label chip, due date
│               └── "Add card" inline form
├── AddColumnButton
├── CardDetailModal   (portal, shown when a card is clicked)
└── ConfirmModal      (portal, shown before destructive actions)
```

---

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Server Component for initial fetch | Avoids a client-side loading flash; the skeleton only shows on subsequent navigations |
| Optimistic UI with snapshot rollback | Keeps interactions feeling instant while guaranteeing consistency on failure |
| `ApiResult<T>` wrapper | Uniform `{ data, error }` shape prevents uncaught promise rejections and makes error handling explicit at every call site |
| `col_order` / `card_order` as compacted integers | Simple to reason about; no floating-point drift or gap-based ordering complexity |
| `@dnd-kit` over `react-beautiful-dnd` | Actively maintained, accessible by default, and works with React 19 concurrent mode |
| Single migration file | Keeps the DB setup to one copy-paste step; no migration runner needed for a single-board app |

---

## ⚖️ Trade-offs & Known Shortcuts

### Single-board, no authentication
The app manages one hard-coded board (`board-001`). Row Level Security is enabled but uses a public `USING (true)` policy — anyone with the anon key can read and write all data. This was an intentional shortcut to keep the scope focused on the Kanban UX rather than auth flows.

**Production fix**: Add Supabase Auth, scope RLS policies to `auth.uid()`, and support multiple boards per user.

### Parallel batch updates instead of a transaction
Card reordering and moves issue one `UPDATE` per affected card in parallel (`Promise.all`). If one update fails mid-batch, the database can end up in a partially-updated state while the UI rolls back to the previous snapshot.

**Production fix**: Use a Supabase Edge Function or a PostgreSQL stored procedure to wrap the batch in a single transaction.

### No real-time multi-user sync
The board does not subscribe to Supabase Realtime. Two users editing the same board simultaneously will see stale data until they reload.

**Production fix**: Add `supabase.channel().on('postgres_changes', …)` subscriptions in `useBoardState` to receive live updates.

### Stats are positional, not semantic
The "In Progress" and "Done" counters in the topbar are derived from the second-to-last and last columns by `col_order`. This is a heuristic that works for the default four-column layout but breaks if users reorder columns in unexpected ways.

**Production fix**: Add a `column_type` enum (`todo | in_progress | review | done`) to the `columns` table and filter by type.

### `due_date` stored as TEXT
Due dates are stored as `TEXT` (`YYYY-MM-DD`) rather than `DATE`. This avoids timezone conversion issues in the browser but prevents server-side date arithmetic.

**Production fix**: Store as `DATE` and handle timezone normalization in the API layer.

