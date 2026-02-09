export { default as AIBotWidget } from './components/AIBotWidget';
export { default as AIBotChat } from './components/AIBotChat';
export { aiBotService } from './services/aiBotService';
export { useAIBot } from './hooks/useAIBot';
export type {
  AIQueryRequest,
  AIQueryResponse,
  SearchRequest,
  SearchResponse,
  SuggestionRequest,
  SuggestionResponse,
  DashboardData
} from './services/aiBotService';