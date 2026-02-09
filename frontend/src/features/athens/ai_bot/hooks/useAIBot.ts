import { useState, useCallback } from 'react';
import { aiBotService } from '../services/aiBotService';

export const useAIBot = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const queryAI = useCallback(async (query: string, module?: string) => {
    setIsLoading(true);
    try {
      const response = await aiBotService.queryAI({ query, module });
      setIsLoading(false);
      return response.data;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  const getSuggestions = useCallback(async (context: string, partialText: string) => {
    setIsLoading(true);
    try {
      const response = await aiBotService.getTextSuggestions({ context, partial_text: partialText });
      setSuggestions(response.suggestions);
      setIsLoading(false);
      return response.suggestions;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  return {
    isLoading,
    suggestions,
    queryAI,
    getSuggestions,
  };
};
