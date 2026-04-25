export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
  label?: 'bug' | 'feature' | 'improvement' | 'chore' | null;
  dueDate?: string | null;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  color: string;
}

export interface Board {
  id: string;
  title: string;
  columns: Column[];
  cards: Card[];
}
