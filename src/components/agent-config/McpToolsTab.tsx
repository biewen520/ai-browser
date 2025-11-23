import React from 'react';
import { Card, Switch, Space, Divider, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { McpToolSchema } from '@/types';

const { Title, Text, Paragraph } = Typography;

interface McpToolsTabProps {
  tools: McpToolSchema[];
  onToolToggle: (toolName: string, enabled: boolean) => void;
}

/**
 * MCP Tools Configuration Tab Component
 * Displays available MCP tools and allows users to enable/disable them
 */
export const McpToolsTab: React.FC<McpToolsTabProps> = ({
  tools,
  onToolToggle
}) => {
  const { t } = useTranslation('agentConfig');

  return (
    <Card>
      <Space direction="vertical" size="large" className="w-full">
        <div>
          <Title level={4} className="m-0">{t('available_tools')}</Title>
          <Paragraph type="secondary">
            {t('mcp_tools_desc')}
          </Paragraph>
        </div>

        <Divider />

        {tools.length === 0 ? (
          <div className="text-center py-10">
            <Text type="secondary">{t('no_tools')}</Text>
          </div>
        ) : (
          <Space direction="vertical" size="middle" className="w-full">
            {tools.map((tool) => (
              <Card
                key={tool.name}
                size="small"
                className={tool.enabled
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
                }
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Text strong className="text-base">{tool.name}</Text>
                      <Switch
                        checked={tool.enabled}
                        onChange={(enabled) => onToolToggle(tool.name, enabled)}
                      />
                    </div>
                    <Paragraph
                      type="secondary"
                      className="m-0 text-sm"
                    >
                      {tool.description}
                    </Paragraph>
                    {tool.inputSchema.required.length > 0 && (
                      <div className="mt-2">
                        <Text type="secondary" className="text-xs">
                          {t('required_params')}: {tool.inputSchema.required.join(', ')}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  );
};
