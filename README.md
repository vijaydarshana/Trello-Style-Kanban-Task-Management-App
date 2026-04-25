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

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are available in your Supabase project under **Settings → API**.

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

## 🗄 Data Model

```
boards
  id TEXT PK
  title TEXT
  created_at TIMESTAMPTZ

columns
  id TEXT PK
  board_id TEXT → boards(id) ON DELETE CASCADE
  title TEXT
  col_order INTEGER          -- display position (0-based)
  color TEXT                 -- hex color for the column dot
  created_at TIMESTAMPTZ

cards
  id TEXT PK
  column_id TEXT → columns(id) ON DELETE CASCADE
  title TEXT
  description TEXT
  card_order INTEGER          -- position within the column (0-based)
  label TEXT                  -- 'bug' | 'feature' | 'improvement' | 'chore' | NULL
  due_date TEXT               -- ISO date string (YYYY-MM-DD) or NULL
  created_at TIMESTAMPTZ
```

**Cascading deletes**: Deleting a board removes all its columns; deleting a column removes all its cards. This is enforced at the database level via `ON DELETE CASCADE` foreign keys, so the application layer only needs to issue a single `DELETE` on the parent row.

**Order handling**: Both `col_order` and `card_order` are integer positions (0-based). On every drag-end, the affected rows are batch-updated in parallel. There is no gap-based ordering — positions are always compacted to `[0, 1, 2, …]` after each reorder.

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

---

## 🙏 Acknowledgments

Built with [Rocket.new](https://rocket.new) · Powered by Next.js, React, and Supabase · Styled with Tailwind CSS