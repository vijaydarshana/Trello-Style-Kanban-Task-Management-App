-- Kanban Board: columns and cards tables
-- No auth required (single-user app per spec)

-- 1. Boards table
CREATE TABLE IF NOT EXISTS public.boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Columns table
CREATE TABLE IF NOT EXISTS public.columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  col_order INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Cards table
CREATE TABLE IF NOT EXISTS public.cards (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  card_order INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  due_date TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON public.columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_col_order ON public.columns(col_order);
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON public.cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_card_order ON public.cards(card_order);

-- 5. Enable RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (public access - no auth required per spec)
DROP POLICY IF EXISTS "public_access_boards" ON public.boards;
CREATE POLICY "public_access_boards" ON public.boards FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_columns" ON public.columns;
CREATE POLICY "public_access_columns" ON public.columns FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_cards" ON public.cards;
CREATE POLICY "public_access_cards" ON public.cards FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. Seed data
DO $$
BEGIN
  -- Insert default board
  INSERT INTO public.boards (id, title)
  VALUES ('board-001', 'Product Roadmap Q2 2026')
  ON CONFLICT (id) DO NOTHING;

  -- Insert default columns
  INSERT INTO public.columns (id, board_id, title, col_order, color) VALUES
    ('col-todo',       'board-001', 'To Do',       0, '#6366f1'),
    ('col-inprogress', 'board-001', 'In Progress',  1, '#f59e0b'),
    ('col-review',     'board-001', 'In Review',    2, '#8b5cf6'),
    ('col-done',       'board-001', 'Done',         3, '#10b981')
  ON CONFLICT (id) DO NOTHING;

  -- Insert default cards
  INSERT INTO public.cards (id, column_id, title, description, card_order, label, due_date) VALUES
    ('card-001', 'col-todo',       'Set up CI/CD pipeline for staging environment',       'Configure GitHub Actions to auto-deploy to staging on every push to the main branch. Include linting and test steps before deploy.', 0, 'chore',       '2026-05-02'),
    ('card-002', 'col-todo',       'Design onboarding flow wireframes',                   'Create low-fidelity wireframes for the 5-step user onboarding sequence. Share with team for async review.',                          1, 'feature',     '2026-04-30'),
    ('card-003', 'col-todo',       'Audit third-party dependencies for security vulnerabilities', '',                                                                                                                             2, 'bug',         NULL),
    ('card-004', 'col-todo',       'Write unit tests for payment module',                 'Cover all edge cases in the Stripe webhook handler and refund logic. Aim for 90%+ coverage.',                                        3, 'chore',       '2026-05-07'),
    ('card-005', 'col-inprogress', 'Implement real-time notification system',             'Use WebSockets to push card move and comment notifications to all active board members. Fallback to polling for unsupported browsers.', 0, 'feature',   '2026-04-26'),
    ('card-006', 'col-inprogress', 'Refactor authentication middleware',                  'Extract JWT validation into a shared middleware. Remove duplicated auth logic across 12 route handlers.',                             1, 'improvement', '2026-04-25'),
    ('card-007', 'col-inprogress', 'Build CSV export for analytics dashboard',            'Allow users to export filtered table data as CSV. Include all visible columns in the export.',                                        2, 'feature',     NULL),
    ('card-008', 'col-review',     'Mobile responsive layout for settings page',          'The settings page breaks on viewports below 768px. Fix layout stacking and input sizing.',                                            0, 'bug',         '2026-04-24'),
    ('card-009', 'col-review',     'API rate limiting implementation',                    'Add per-user rate limiting to all public API endpoints using Redis. Limit to 100 req/min per token.',                                 1, 'improvement', '2026-04-28'),
    ('card-010', 'col-done',       'Migrate database to PostgreSQL 16',                   'Successfully migrated all production data from PostgreSQL 14 to 16. Zero downtime via logical replication.',                          0, 'chore',       NULL),
    ('card-011', 'col-done',       'Redesign pricing page',                               'Launched new 3-tier pricing layout with comparison table. A/B test running — control vs new.',                                       1, 'improvement', NULL),
    ('card-012', 'col-done',       'Fix memory leak in background job processor',         'Identified and resolved unclosed DB connections in the nightly report job. Memory usage dropped 40%.',                               2, 'bug',         NULL)
  ON CONFLICT (id) DO NOTHING;
END $$;
