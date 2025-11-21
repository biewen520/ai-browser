import { DisplayMessage, AgentGroupMessage } from '@/models';

/**
 * Atomic message fragment - the smallest unit for playback
 * Each fragment contains a single piece of text that can be displayed with typewriter effect
 */
export interface AtomicMessageFragment {
  id: string;
  type: 'user' | 'thinking' | 'agent-task' | 'agent-node' | 'text' | 'tool' | 'human-interaction' | 'agent-group-header';
  content: string;
  originalMessageId: string;
  timestamp?: Date;
  data?: any; // Additional data like agent name, tool info, etc.
}

/**
 * Render node text to string
 */
const renderNodeText = (node: any): string => {
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node === 'object' && node !== null) {
    if (node.text && typeof node.text === 'string') {
      return node.text;
    }
    return 'Step';
  }
  return String(node || 'Step');
};

/**
 * Flatten a DisplayMessage into atomic fragments
 * Each fragment represents a single text element that should be displayed sequentially
 */
export function flattenMessage(message: DisplayMessage): AtomicMessageFragment[] {
  const fragments: AtomicMessageFragment[] = [];

  // User message
  if (message.type === 'user') {
    fragments.push({
      id: `${message.id}-user`,
      type: 'user',
      content: message.content,
      originalMessageId: message.id,
      timestamp: message.timestamp,
    });
  }

  // Workflow message (thinking + agents)
  if (message.type === 'workflow') {
    const workflow = message.workflow;

    // 1. Thinking fragment
    if (workflow?.thought) {
      fragments.push({
        id: `${message.id}-thinking`,
        type: 'thinking',
        content: workflow.thought,
        originalMessageId: message.id,
        timestamp: message.timestamp,
        data: {
          isCompleted: workflow.agents && workflow.agents.length > 0,
        },
      });
    }

    // 2. Agent fragments
    if (workflow?.agents && workflow.agents.length > 0) {
      workflow.agents.forEach((agent: any, agentIdx: number) => {
        // Agent task
        if (agent.task) {
          fragments.push({
            id: `${message.id}-agent-${agentIdx}-task`,
            type: 'agent-task',
            content: agent.task,
            originalMessageId: message.id,
            timestamp: message.timestamp,
            data: {
              agentName: agent.name,
              agentId: agent.id,
            },
          });
        }

        // Agent nodes (steps)
        if (agent.nodes && agent.nodes.length > 0) {
          agent.nodes.forEach((node: any, nodeIdx: number) => {
            const nodeText = renderNodeText(node);
            fragments.push({
              id: `${message.id}-agent-${agentIdx}-node-${nodeIdx}`,
              type: 'agent-node',
              content: nodeText,
              originalMessageId: message.id,
              timestamp: message.timestamp,
              data: {
                agentName: agent.name,
                nodeIndex: nodeIdx,
                totalNodes: agent.nodes.length,
              },
            });
          });
        }
      });
    }
  }

  // Agent group message
  if (message.type === 'agent_group') {
    const agentGroup = message as AgentGroupMessage;

    // 1. Add agent group header fragment (agent name + task + status)
    fragments.push({
      id: `${message.id}-agent-header`,
      type: 'agent-group-header',
      content: agentGroup.agentNode?.task || agentGroup.agentName,
      originalMessageId: message.id,
      timestamp: message.timestamp,
      data: {
        agentName: agentGroup.agentName,
        agentNode: agentGroup.agentNode,
        status: agentGroup.status,
      },
    });

    // 2. Process each message in the agent group
    agentGroup.messages.forEach((agentMessage, idx) => {
      if (agentMessage.type === 'text' && agentMessage.content) {
        fragments.push({
          id: `${message.id}-agent-text-${idx}`,
          type: 'text',
          content: agentMessage.content,
          originalMessageId: message.id,
          timestamp: message.timestamp,
        });
      }

      if (agentMessage.type === 'tool') {
        // Tools are displayed as a whole, not flattened further
        fragments.push({
          id: `${message.id}-tool-${idx}`,
          type: 'tool',
          content: '', // Tools don't have text content
          originalMessageId: message.id,
          timestamp: message.timestamp,
          data: {
            toolMessage: agentMessage,
          },
        });
      }

      if (agentMessage.type === 'human_interaction_request') {
        fragments.push({
          id: `${message.id}-human-${idx}`,
          type: 'human-interaction',
          content: '',
          originalMessageId: message.id,
          timestamp: message.timestamp,
          data: {
            humanMessage: agentMessage,
          },
        });
      }
    });
  }

  return fragments;
}

/**
 * Flatten multiple messages into atomic fragments
 */
export function flattenMessages(messages: DisplayMessage[]): AtomicMessageFragment[] {
  const allFragments: AtomicMessageFragment[] = [];

  messages.forEach((message) => {
    const messageFragments = flattenMessage(message);
    allFragments.push(...messageFragments);
  });

  return allFragments;
}

/**
 * Calculate text length for typewriter timing
 */
export function getFragmentTextLength(fragment: AtomicMessageFragment): number {
  if (fragment.type === 'tool' || fragment.type === 'human-interaction' || fragment.type === 'agent-group-header') {
    return 0; // No typewriter for these (they appear instantly)
  }
  return fragment.content.length;
}
