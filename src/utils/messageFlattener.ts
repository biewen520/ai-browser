import type {
  DisplayMessage,
  AgentGroupMessage,
  WorkflowMessage,
  AtomicMessageFragment,
  FragmentType,
} from '@/models';

/**
 * Node structure in workflow
 */
interface WorkflowNode {
  text?: string;
  [key: string]: unknown;
}

/**
 * Agent structure in workflow (dynamic data)
 */
interface DynamicAgent {
  id?: string;
  name?: string;
  task?: string;
  nodes?: WorkflowNode[];
}

/**
 * Dynamic workflow data (extracted from WorkflowData)
 */
interface DynamicWorkflowData {
  thought?: string;
  agents?: DynamicAgent[];
}

/**
 * Safely extract workflow data with type checking
 */
const extractWorkflowData = (workflow: any): DynamicWorkflowData => ({
  thought: typeof workflow?.thought === 'string' ? workflow.thought : undefined,
  agents: Array.isArray(workflow?.agents) ? workflow.agents : undefined,
});

/**
 * Render node text to string
 */
const renderNodeText = (node: unknown): string => {
  if (typeof node === 'string') return node;

  if (typeof node === 'object' && node !== null) {
    const nodeObj = node as WorkflowNode;
    if (typeof nodeObj.text === 'string') return nodeObj.text;
    return 'Step';
  }

  return String(node || 'Step');
};

/**
 * Check if agents exist and have items
 */
const hasAgents = (agents?: DynamicAgent[]): agents is DynamicAgent[] =>
  Array.isArray(agents) && agents.length > 0;

/**
 * Process user message into fragments
 */
const processUserMessage = (message: DisplayMessage): AtomicMessageFragment[] => {
  if (message.type !== 'user') return [];

  return [{
    id: `${message.id}-user`,
    type: 'user' as FragmentType,
    content: message.content,
    originalMessageId: message.id,
    timestamp: message.timestamp,
  }];
};

/**
 * Process workflow message into fragments
 */
const processWorkflowMessage = (message: DisplayMessage): AtomicMessageFragment[] => {
  if (message.type !== 'workflow') return [];

  const workflowMessage = message as WorkflowMessage;
  const { thought, agents } = extractWorkflowData(workflowMessage.workflow);
  const fragments: AtomicMessageFragment[] = [];

  // Add thinking fragment
  if (thought) {
    fragments.push({
      id: `${message.id}-thinking`,
      type: 'thinking',
      content: thought,
      originalMessageId: message.id,
      timestamp: message.timestamp,
      data: {
        isCompleted: hasAgents(agents),
      },
    });
  }

  // Add agent fragments
  if (hasAgents(agents)) {
    agents.forEach((agent, agentIdx) => {
      // Add agent task
      if (agent.task) {
        fragments.push({
          id: `${message.id}-agent-${agentIdx}-task`,
          type: 'agent-task',
          content: agent.task,
          originalMessageId: message.id,
          timestamp: message.timestamp,
          data: {
            agentName: agent.name || '',
            agentId: agent.id || '',
          },
        });
      }

      // Add agent nodes (steps)
      if (agent.nodes?.length) {
        agent.nodes.forEach((node, nodeIdx) => {
          fragments.push({
            id: `${message.id}-agent-${agentIdx}-node-${nodeIdx}`,
            type: 'agent-node',
            content: renderNodeText(node),
            originalMessageId: message.id,
            timestamp: message.timestamp,
            data: {
              agentName: agent.name || '',
              nodeIndex: nodeIdx,
              totalNodes: agent.nodes!.length,
            },
          });
        });
      }
    });
  }

  return fragments;
};

/**
 * Process agent group message into fragments
 */
const processAgentGroupMessage = (message: DisplayMessage): AtomicMessageFragment[] => {
  if (message.type !== 'agent_group') return [];

  const agentGroup = message as AgentGroupMessage;
  const fragments: AtomicMessageFragment[] = [];

  // Add agent group header
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

  // Process each message in the agent group
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
      fragments.push({
        id: `${message.id}-tool-${idx}`,
        type: 'tool',
        content: '',
        originalMessageId: message.id,
        timestamp: message.timestamp,
        data: {
          toolMessage: agentMessage,
        },
      });
    }
  });

  return fragments;
};

/**
 * Flatten a DisplayMessage into atomic fragments
 * Each fragment represents a single text element that should be displayed sequentially
 */
export function flattenMessage(message: DisplayMessage): AtomicMessageFragment[] {
  return [
    ...processUserMessage(message),
    ...processWorkflowMessage(message),
    ...processAgentGroupMessage(message),
  ];
}

/**
 * Flatten multiple messages into atomic fragments
 */
export function flattenMessages(messages: DisplayMessage[]): AtomicMessageFragment[] {
  return messages.flatMap(flattenMessage);
}

/**
 * Fragment types that appear instantly (no typewriter effect)
 */
const INSTANT_FRAGMENT_TYPES = new Set<FragmentType>([
  'tool',
  'human-interaction',
  'agent-group-header',
]);

/**
 * Calculate text length for typewriter timing
 */
export function getFragmentTextLength(fragment: AtomicMessageFragment): number {
  return INSTANT_FRAGMENT_TYPES.has(fragment.type) ? 0 : fragment.content.length;
}
