/**
 * Model configuration types for AI providers
 */

export type ProviderType = 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter';

export interface UserModelConfigs {
  deepseek?: {
    apiKey?: string
    baseURL?: string
    model?: string
  }
  qwen?: {
    apiKey?: string
    model?: string
  }
  google?: {
    apiKey?: string
    model?: string
  }
  anthropic?: {
    apiKey?: string
    model?: string
  }
  openrouter?: {
    apiKey?: string
    model?: string
  }
  selectedProvider?: ProviderType
}
