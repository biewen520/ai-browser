/**
 * MCP (Model Context Protocol) tool types
 */

export interface McpToolSchema {
  name: string
  description: string
  enabled: boolean
  inputSchema: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}
