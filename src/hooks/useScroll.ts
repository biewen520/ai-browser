import { useRef, useState, useEffect, useCallback } from 'react';
import { DisplayMessage, AgentGroupMessage, ToolAction } from '@/models';

interface UseScrollOptions {
  displayMessages: DisplayMessage[];
  isHistoryMode: boolean;
  playbackStatus: 'idle' | 'playing' | 'paused' | 'completed';
  toolHistory: (ToolAction & { screenshot?: string; toolSequence?: number })[];
}

/**
 * Hook for managing scroll behavior
 * Handles auto-scroll during playback and user scroll detection
 */
export const useScroll = ({ displayMessages, isHistoryMode, playbackStatus, toolHistory }: UseScrollOptions) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Calculate total content length to detect content changes during playback
  const totalContentLength = displayMessages.reduce((total, msg) => {
    if (msg.type === 'user') {
      return total + msg.content.length;
    } else if (msg.type === 'workflow') {
      const thought = (msg.workflow as any)?.thought || '';
      const thoughtLength = typeof thought === 'string' ? thought.length : 0;

      // Count agents and their nodes to detect workflow updates
      const agents = (msg.workflow as any)?.agents || [];
      const agentCount = Array.isArray(agents) ? agents.length : 0;
      const nodeCount = Array.isArray(agents)
        ? agents.reduce((sum: number, agent: any) => {
            const nodes = agent?.nodes || [];
            return sum + (Array.isArray(nodes) ? nodes.length : 0);
          }, 0)
        : 0;

      return total + thoughtLength + agentCount + nodeCount;
    } else if (msg.type === 'agent_group') {
      const agentGroup = msg as AgentGroupMessage;
      // Count both text and tool messages to trigger scroll on any update
      const messageCount = agentGroup.messages.length;
      const textContent = agentGroup.messages
        .filter(m => m.type === 'text')
        .reduce((sum, m) => sum + ((m as any).content?.length || 0), 0);
      // Use message count as additional signal to detect tool additions
      return total + textContent + messageCount;
    }
    return total;
  }, 0);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const atBottom = distanceFromBottom < 50;

      setIsAtBottom(atBottom);
    }
  }, []);

  // Auto scroll to bottom during playback (monitors content growth, not just message count)
  useEffect(() => {
    if (isHistoryMode && playbackStatus === 'playing' && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [isHistoryMode, totalContentLength, playbackStatus]);

  // Monitor message changes, auto scroll to bottom in normal mode
  // Only auto-scroll when user is at bottom (isAtBottom = true)
  // This allows users to scroll up and view content without being interrupted
  // Also monitors toolHistory to trigger scroll when tools complete
  useEffect(() => {
    if (!isHistoryMode && isAtBottom && displayMessages.length > 0) {
      scrollToBottom();
    }
  }, [totalContentLength, isHistoryMode, isAtBottom, scrollToBottom, displayMessages.length, toolHistory.length]);

  return {
    scrollContainerRef,
    isAtBottom,
    scrollToBottom,
    handleScroll,
  };
};
