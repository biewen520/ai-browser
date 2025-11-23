/**
 * History Components - Unified Exports
 *
 * This module provides history panel components.
 * Components have been split from a single 479-line file into logical modules.
 */

// Main panel component
export { HistoryPanel } from './HistoryPanel';

// Sub-components
export { HistoryList } from './HistoryList';

// Hooks
export { useHistoryData } from './hooks/useHistoryData';
export type { HistoryItem, HistoryStats } from './hooks/useHistoryData';
