import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type {
  Incident,
  IncidentListItem,
  IncidentFormData,
  IncidentFilters,
  PaginatedResponse,
  IncidentDashboardStats,
} from '../types';
import { incidentApi } from '../services/api';
import { useAuthStore } from '../../../store/authStore';

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
      // Mock data - backend not implemented
      const mockIncidents: IncidentListItem[] = [
        {
          id: '1',
          incident_id: 'INC-2025-001',
          title: 'Safety Equipment Malfunction',
          incident_type: 'safety',
          severity_level: 'high',
          status: 'investigating',
          location: 'Building A - Floor 3',
          department: 'Operations',
          reporter_name: 'John Doe',
          assigned_investigator: 1,
          assigned_investigator_details: { full_name: 'Jane Smith' },
          date_time_incident: '2025-02-20T10:30:00Z',
          days_since_reported: 3,
          risk_level: 'high',
          risk_matrix_score: 16,
          priority_score: 18,
          estimated_cost: 25000,
          business_impact: 'high',
          regulatory_reportable: true,
          escalation_level: 3
        },
        {
          id: '2',
          incident_id: 'INC-2025-002',
          title: 'Minor Spill in Storage Area',
          incident_type: 'environmental',
          severity_level: 'low',
          status: 'open',
          location: 'Warehouse B',
          department: 'Logistics',
          reporter_name: 'Mike Johnson',
          assigned_investigator: null,
          assigned_investigator_details: null,
          date_time_incident: '2025-02-22T14:15:00Z',
          days_since_reported: 1,
          risk_level: 'low',
          risk_matrix_score: 4,
          priority_score: 6,
          estimated_cost: 1500,
          business_impact: 'low',
          regulatory_reportable: false,
          escalation_level: 1
        }
      ];

      setIncidents(mockIncidents);
      setPagination({
        current: page,
        pageSize: pagination.pageSize,
        total: mockIncidents.length,
        hasNext: false,
        hasPrevious: false,
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
      // Mock success
      message.success('Incident created successfully');
      const newIncident = { id: String(Date.now()), ...data } as any;
      await refetch();
      return newIncident;
    } catch (err: any) {
      message.error('Failed to create incident');
      return null;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const updateIncident = useCallback(async (id: string, data: Partial<IncidentFormData>): Promise<Incident | null> => {
    setLoading(true);
    try {
      message.success('Incident updated successfully');
      await refetch();
      return { id, ...data } as any;
    } catch (err: any) {
      message.error('Failed to update incident');
      return null;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const deleteIncident = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      message.success('Incident deleted successfully');
      await refetch();
      return true;
    } catch (err: any) {
      message.error('Failed to delete incident');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch]);



  const closeIncident = useCallback(async (id: string, closureNotes?: string): Promise<boolean> => {
    setLoading(true);
    try {
      message.success('Incident closed successfully');
      await refetch();
      return true;
    } catch (err: any) {
      message.error('Failed to close incident');
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
