import { createClient } from '@/lib/supabase/client';
import type { Board, Column, Card } from '../types';

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function dbColToColumn(row: Record<string, unknown>): Column {
  return {
    id: row.id as string,
    title: row.title as string,
    order: row.col_order as number,
    color: row.color as string,
  };
}

function dbCardToCard(row: Record<string, unknown>): Card {
  return {
    id: row.id as string,
    columnId: row.column_id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    order: row.card_order as number,
    label: (row.label as Card['label']) ?? null,
    dueDate: (row.due_date as string) ?? null,
  };
}

// ─── Board ────────────────────────────────────────────────────────────────────

export async function loadBoard(boardId: string): Promise<ApiResult<Board>> {
  try {
    const supabase = createClient();

    const { data: boardRows, error: boardErr } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .limit(1);

    if (boardErr) return { data: null, error: boardErr.message };
    const boardRow = boardRows?.[0];
    if (!boardRow) return { data: null, error: 'Board not found' };

    const { data: colRows, error: colErr } = await supabase
      .from('columns')
      .select('*')
      .eq('board_id', boardId)
      .order('col_order', { ascending: true });

    if (colErr) return { data: null, error: colErr.message };

    const columnIds = (colRows ?? []).map((c) => c.id as string);

    let cardRows: Record<string, unknown>[] = [];
    if (columnIds.length > 0) {
      const { data: cards, error: cardErr } = await supabase
        .from('cards')
        .select('*')
        .in('column_id', columnIds)
        .order('card_order', { ascending: true });

      if (cardErr) return { data: null, error: cardErr.message };
      cardRows = (cards ?? []) as Record<string, unknown>[];
    }

    const board: Board = {
      id: boardRow.id as string,
      title: boardRow.title as string,
      columns: (colRows ?? []).map((r) => dbColToColumn(r as Record<string, unknown>)),
      cards: cardRows.map((r) => dbCardToCard(r)),
    };

    return { data: board, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to load board' };
  }
}

// ─── Columns ──────────────────────────────────────────────────────────────────

export async function createColumn(column: Column, boardId: string): Promise<ApiResult<Column>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('columns')
    .insert({
      id: column.id,
      board_id: boardId,
      title: column.title,
      col_order: column.order,
      color: column.color,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: dbColToColumn(data as Record<string, unknown>), error: null };
}

export async function updateColumn(columnId: string, updates: Partial<Column>): Promise<ApiResult<boolean>> {
  const supabase = createClient();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.order !== undefined) dbUpdates.col_order = updates.order;
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  const { error } = await supabase
    .from('columns')
    .update(dbUpdates)
    .eq('id', columnId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function deleteColumn(columnId: string): Promise<ApiResult<boolean>> {
  const supabase = createClient();
  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('id', columnId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function reorderColumns(columns: Array<{ id: string; order: number }>): Promise<ApiResult<boolean>> {
  try {
    const supabase = createClient();
    const results = await Promise.all(
      columns.map((c) =>
        supabase
          .from('columns')
          .update({ col_order: c.order })
          .eq('id', c.id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return { data: null, error: failed.error.message };
    return { data: true, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to reorder columns' };
  }
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function createCard(card: Card): Promise<ApiResult<Card>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cards')
    .insert({
      id: card.id,
      column_id: card.columnId,
      title: card.title,
      description: card.description,
      card_order: card.order,
      label: card.label ?? null,
      due_date: card.dueDate ?? null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: dbCardToCard(data as Record<string, unknown>), error: null };
}

export async function updateCard(cardId: string, updates: Partial<Card>): Promise<ApiResult<boolean>> {
  const supabase = createClient();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.order !== undefined) dbUpdates.card_order = updates.order;
  if (updates.columnId !== undefined) dbUpdates.column_id = updates.columnId;
  if ('label' in updates) dbUpdates.label = updates.label ?? null;
  if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate ?? null;

  const { error } = await supabase
    .from('cards')
    .update(dbUpdates)
    .eq('id', cardId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function deleteCard(cardId: string): Promise<ApiResult<boolean>> {
  const supabase = createClient();
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId);

  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function moveCard(
  affectedCards: Array<{ id: string; columnId: string; order: number }>
): Promise<ApiResult<boolean>> {
  try {
    const supabase = createClient();
    const results = await Promise.all(
      affectedCards.map((c) =>
        supabase
          .from('cards')
          .update({ column_id: c.columnId, card_order: c.order })
          .eq('id', c.id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return { data: null, error: failed.error.message };
    return { data: true, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to move card' };
  }
}
