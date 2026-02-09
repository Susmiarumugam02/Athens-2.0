import axios from 'axios';
import useAuthStore from '@common/store/authStore';
import { sanitizeInput, RateLimiter } from '@common/utils/security';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/v1/ai_bot`;

export interface AIQueryRequest {
  query: string;
  module?: string;
}

export interface RAGQueryResponse {
  success: boolean;
  data: {
    type: 'rag_results' | 'rag_no_results';
    answer: string;
    sources: Array<{ module: string; id: number; title?: string; snippet: string; score: number }>;
    missing_fields: string[];
  };
}

export interface AIQueryResponse {
  success: boolean;
  data: any;
  query: string;
}

export interface SearchRequest {
  query: string;
  module?: string;
}

export interface SearchResponse {
  success: boolean;
  results: any[];
  count: number;
}

export interface SuggestionRequest {
  context: string;
  partial_text: string;
}

export interface SuggestionResponse {
  success: boolean;
  suggestions: string[];
}

export interface DashboardData {
  overview: any;
  user_stats: any;
  incident_stats: any;
  ptw_stats: any;
  training_stats: any;
  safety_stats: any;
  manpower_stats: any;
}

class AIBotService {
  private rateLimiter = new RateLimiter();
  
  private getAuthHeaders() {
    const token = useAuthStore.getState().token;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }
  
  private validateInput(input: string, maxLength: number = 500): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input');
    }
    
    const sanitized = sanitizeInput(input);
    if (sanitized.length > maxLength) {
      throw new Error('Input too long');
    }
    
    return sanitized;
  }

  async queryAI(request: AIQueryRequest): Promise<AIQueryResponse> {
    if (!this.rateLimiter.isAllowed('ai_query', 10, 60000)) {
      throw new Error('Rate limit exceeded');
    }
    const sanitizedQuery = this.validateInput(request.query);
    const sanitizedModule = request.module ? this.validateInput(request.module, 50) : undefined;
    const sanitizedRequest = { query: sanitizedQuery, module: sanitizedModule };
    const response = await axios.post(`${API_BASE_URL}/query/`, sanitizedRequest, {
      headers: this.getAuthHeaders(),
      timeout: 30000,
    });
    return response.data;
  }

  async queryRAG(query: string): Promise<RAGQueryResponse> {
    if (!this.rateLimiter.isAllowed('rag_query', 20, 60000)) {
      throw new Error('Rate limit exceeded');
    }
    const sanitizedQuery = this.validateInput(query);
    const response = await axios.post(`${API_BASE_URL}/rag/query/`, { query: sanitizedQuery }, {
      headers: this.getAuthHeaders(),
      timeout: 45000,
    });
    return response.data as RAGQueryResponse;
  }

  async rebuildRAGIndex(): Promise<{ success: boolean; stats: any }> {
    if (!this.rateLimiter.isAllowed('rag_reindex', 2, 60000)) {
      throw new Error('Rate limit exceeded');
    }
    const response = await axios.post(`${API_BASE_URL}/rag/reindex/`, {}, {
      headers: this.getAuthHeaders(),
      timeout: 120000,
    });
    return response.data;
  }

  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  async searchData(request: SearchRequest): Promise<SearchResponse> {
    // Rate limiting
    if (!this.rateLimiter.isAllowed('search', 20, 60000)) {
      throw new Error('Rate limit exceeded');
    }
    
    try {
      // Validate and sanitize input
      const sanitizedQuery = this.validateInput(request.query);
      const sanitizedModule = request.module ? this.validateInput(request.module, 50) : undefined;
      
      const sanitizedRequest = {
        query: sanitizedQuery,
        module: sanitizedModule
      };
      
      const response = await axios.post(`${API_BASE_URL}/search/`, sanitizedRequest, {
        headers: this.getAuthHeaders(),
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getTextSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/suggest/`, request, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getQuickStats() {
    try {
      const dashboardData = await this.getDashboardData();
      return {
        totalIncidents: dashboardData.incident_stats?.total_incidents || 0,
        openIncidents: dashboardData.incident_stats?.open_incidents || 0,
        totalPTWs: dashboardData.ptw_stats?.total_permits || 0,
        activeWorkers: dashboardData.manpower_stats?.active_workers || 0,
        openObservations: dashboardData.safety_stats?.open_observations || 0,
        totalTrainings: dashboardData.training_stats?.total_trainings || 0,
      };
    } catch (error) {
      return {
        totalIncidents: 0,
        openIncidents: 0,
        totalPTWs: 0,
        activeWorkers: 0,
        openObservations: 0,
        totalTrainings: 0,
      };
    }
  }
}

export const aiBotService = new AIBotService();
