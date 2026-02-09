import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  Incident,
  IncidentListItem,
  IncidentFormData,
  IncidentFilters,
  PaginatedResponse,
  IncidentDashboardStats,
} from '../types';
import { incidentApi } from '../services/api';
import useAuthStore from '../../../common/store/authStore';

export interface UseIncidentsOptions {
  autoFetch?: boolean;
  filters?: IncidentFilters;
  pageSize?: number;
}

export interface UseIncidentsReturn {
  incidents: IncidentListItem[];
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: IncidentFilters;
  setFilters: (filters: IncidentFilters) => void;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
  createIncident: (data: IncidentFormData) => Promise<Incident | null>;
  updateIncident: (id: string, data: Partial<IncidentFormData>) => Promise<Incident | null>;
  deleteIncident: (id: string) => Promise<boolean>;
  closeIncident: (id: string, closureNotes?: string) => Promise<boolean>;
  updateStatus: (id: string, status: string, notes?: string) => Promise<boolean>;
}

export const useIncidents = (options: UseIncidentsOptions = {}): UseIncidentsReturn => {
  const { autoFetch = true, filters: initialFilters = {}, pageSize = 20 } = options;

  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<IncidentFilters>(initialFilters);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize,
    total: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const fetchIncidents = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response: PaginatedResponse<IncidentListItem> = await incidentApi.getIncidents(
        filters,
        page,
        pagination.pageSize
      );

      setIncidents(response.results);
      setPagination({
        current: page,
        pageSize: pagination.pageSize,
        total: response.count,
        hasNext: !!response.next,
        hasPrevious: !!response.previous,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch incidents';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize]);

  const refetch = useCallback(() => fetchIncidents(pagination.current), [fetchIncidents, pagination.current]);

  const setPage = useCallback((page: number) => {
    fetchIncidents(page);
  }, [fetchIncidents]);

  const createIncident = useCallback(async (data: IncidentFormData): Promise<Incident | null> => {
    setLoading(true);
    try {
      const newIncident = await incidentApi.createIncident(data);
      message.success('Incident created successfully');
      await refetch(); // Refresh the list
      return newIncident;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create incident';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const updateIncident = useCallback(async (id: string, data: Partial<IncidentFormData>): Promise<Incident | null> => {
    setLoading(true);
    try {
      const updatedIncident = await incidentApi.updateIncident(id, data);
      message.success('Incident updated successfully');
      await refetch(); // Refresh the list
      return updatedIncident;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update incident';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const deleteIncident = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      await incidentApi.deleteIncident(id);
      message.success('Incident deleted successfully');
      await refetch(); // Refresh the list
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete incident';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch]);



  const closeIncident = useCallback(async (id: string, closureNotes?: string): Promise<boolean> => {
    setLoading(true);
    try {
      await incidentApi.closeIncident(id, closureNotes);
      message.success('Incident closed successfully');
      await refetch(); // Refresh the list
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to close incident';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const updateStatus = useCallback(async (id: string, status: string, notes?: string): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await incidentApi.updateStatus(id, status, notes);
      message.success(result.message);
      await refetch(); // Refresh the list
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update status';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  // Effect to fetch incidents when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchIncidents(1); // Reset to first page when filters change
    }
  }, [filters, autoFetch]); // Remove fetchIncidents from dependencies to avoid infinite loop

  // Effect to fetch incidents on mount
  useEffect(() => {
    if (autoFetch) {
      fetchIncidents(1);
    }
  }, []); // Empty dependency array for mount only

  return {
    incidents,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    setPage,
    refetch,
    createIncident,
    updateIncident,
    deleteIncident,
    closeIncident,
    updateStatus,
  };
};

// Hook for single incident
export interface UseIncidentOptions {
  autoFetch?: boolean;
}

export interface UseIncidentReturn {
  incident: Incident | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateIncident: (data: Partial<IncidentFormData>) => Promise<Incident | null>;
  closeIncident: (closureNotes?: string) => Promise<boolean>;
  updateStatus: (status: string, notes?: string) => Promise<boolean>;
}

export const useIncident = (id: string, options: UseIncidentOptions = {}): UseIncidentReturn => {
  const { autoFetch = true } = options;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncident = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedIncident = await incidentApi.getIncident(id);
      setIncident(fetchedIncident);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch incident';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refetch = useCallback(() => fetchIncident(), [fetchIncident]);

  const updateIncident = useCallback(async (data: Partial<IncidentFormData>): Promise<Incident | null> => {
    if (!id) return null;

    setLoading(true);
    try {
      const updatedIncident = await incidentApi.updateIncident(id, data);
      setIncident(updatedIncident);
      message.success('Incident updated successfully');
      return updatedIncident;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update incident';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);



  const closeIncident = useCallback(async (closureNotes?: string): Promise<boolean> => {
    if (!id) return false;

    setLoading(true);
    try {
      const updatedIncident = await incidentApi.closeIncident(id, closureNotes);
      setIncident(updatedIncident);
      message.success('Incident closed successfully');
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to close incident';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateStatus = useCallback(async (status: string, notes?: string): Promise<boolean> => {
    if (!id) return false;

    setLoading(true);
    try {
      const result = await incidentApi.updateStatus(id, status, notes);
      message.success(result.message);
      await refetch(); // Refresh the incident data
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update status';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [id, refetch]);

  useEffect(() => {
    if (autoFetch && id) {
      fetchIncident();
    }
  }, [autoFetch, id, fetchIncident]);

  return {
    incident,
    loading,
    error,
    refetch,
    updateIncident,
    closeIncident,
    updateStatus,
  };
};

// Hook for dashboard statistics
export interface UseDashboardStatsReturn {
  stats: IncidentDashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDashboardStats = (): UseDashboardStatsReturn => {
  const [stats, setStats] = useState<IncidentDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dashboardStats = await incidentApi.getDashboardStats();
      setStats(dashboardStats);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch dashboard statistics';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => fetchStats(), [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch,
  };
};
