import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskType } from '@/models';
import { taskStorage } from '@/services/task-storage';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * History panel display item (unified for normal tasks and scheduled tasks)
 */
export interface HistoryItem {
  id: string; // task.id for normal tasks, scheduledTaskId for scheduled tasks
  name: string;
  taskType: TaskType;
  status?: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  scheduledTaskId?: string; // Scheduled task configuration ID
  latestExecution?: Task; // Latest execution record for scheduled tasks
  executionCount?: number; // Execution count for scheduled tasks
  originalTask?: Task; // Original data for normal tasks
}

export interface HistoryStats {
  total: number;
  completed: number;
  running: number;
  error: number;
}

interface UseHistoryDataProps {
  visible: boolean;
  isTaskDetailMode: boolean;
  scheduledTaskId?: string;
}

/**
 * useHistoryData Hook
 * Manages history data loading, filtering, and statistics
 */
export const useHistoryData = ({ visible, isTaskDetailMode, scheduledTaskId }: UseHistoryDataProps) => {
  const { t } = useTranslation('history');
  const { message } = App.useApp();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    total: 0,
    completed: 0,
    running: 0,
    error: 0
  });

  /**
   * Load and process historical data
   * If in scheduled task detail mode, only show execution history for that scheduled task
   * Otherwise, merge normal tasks and scheduled task execution history
   */
  const loadTasks = async () => {
    setLoading(true);
    try {
      if (isTaskDetailMode && scheduledTaskId) {
        // Scheduled task detail mode: only show all execution history for this scheduled task
        const executions = await taskStorage.getExecutionsByScheduledTaskId(scheduledTaskId);

        const items: HistoryItem[] = executions.map(task => ({
          id: task.id,
          name: task.name,
          taskType: 'scheduled',
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          scheduledTaskId: task.scheduledTaskId,
          originalTask: task,
        }));

        setHistoryItems(items);
        setFilteredItems(items);

        // Statistics
        setStats({
          total: items.length,
          completed: items.filter(item => item.status === 'done').length,
          running: items.filter(item => item.status === 'running').length,
          error: items.filter(item => item.status === 'error' || item.status === 'abort').length
        });
      } else {
        // Main history panel mode: merge normal tasks and scheduled tasks
        const allTasks = await taskStorage.getAllTasks();

        // Separate normal tasks and scheduled task execution history
        const normalTasks = allTasks.filter(t => t.taskType === 'normal');
        const scheduledExecutions = allTasks.filter(t => t.taskType === 'scheduled');

        // Group scheduled task execution history by scheduledTaskId
        const scheduledGroups = new Map<string, Task[]>();
        scheduledExecutions.forEach(task => {
          if (task.scheduledTaskId) {
            if (!scheduledGroups.has(task.scheduledTaskId)) {
              scheduledGroups.set(task.scheduledTaskId, []);
            }
            scheduledGroups.get(task.scheduledTaskId)!.push(task);
          }
        });

        // Build history item list
        const items: HistoryItem[] = [];

        // Add normal tasks
        normalTasks.forEach(task => {
          items.push({
            id: task.id,
            name: task.name,
            taskType: 'normal',
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            originalTask: task,
          });
        });

        // Add scheduled tasks (each scheduled task only shows the latest execution)
        scheduledGroups.forEach((executions, scheduledTaskId) => {
          // Sort by updatedAt, take the latest one
          const sortedExecutions = executions.sort((a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime()
          );
          const latestExecution = sortedExecutions[0];

          items.push({
            id: scheduledTaskId, // Use scheduledTaskId as unique identifier
            name: latestExecution.name,
            taskType: 'scheduled',
            status: latestExecution.status,
            createdAt: latestExecution.createdAt,
            updatedAt: latestExecution.updatedAt,
            scheduledTaskId,
            latestExecution,
            executionCount: executions.length,
          });
        });

        // Sort by updatedAt in descending order (newest first)
        items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        setHistoryItems(items);
        setFilteredItems(items);

        // Statistics
        setStats({
          total: items.length,
          completed: items.filter(item => item.status === 'done').length,
          running: items.filter(item => item.status === 'running').length,
          error: items.filter(item => item.status === 'error' || item.status === 'abort').length
        });
      }
    } catch (error) {
      console.error('Failed to load history tasks:', error);
      message.error(t('load_failed'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Search history items
   */
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    if (!value.trim()) {
      setFilteredItems(historyItems);
    } else {
      const keyword = value.toLowerCase();
      const filtered = historyItems.filter(item =>
        item.name.toLowerCase().includes(keyword)
      );
      setFilteredItems(filtered);
    }
  };

  // Load tasks when panel becomes visible
  useEffect(() => {
    if (visible) {
      loadTasks();
    }
  }, [visible]);

  return {
    historyItems,
    filteredItems,
    loading,
    searchKeyword,
    stats,
    loadTasks,
    handleSearch
  };
};
