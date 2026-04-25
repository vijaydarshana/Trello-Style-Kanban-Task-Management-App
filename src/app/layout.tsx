import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MultiBoardProvider } from '@/contexts/MultiBoardContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'KanbanBoard — Visual Task Management for Teams',
  description: 'A Trello-style Kanban board for managing tasks across columns with drag-and-drop, inline editing, and full CRUD for columns and cards.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <MultiBoardProvider>
            {children}
          </MultiBoardProvider>
        </ThemeProvider>
</body>
    </html>
  );
}