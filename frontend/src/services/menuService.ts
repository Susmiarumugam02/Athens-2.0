import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export interface MenuModule {
  id: number;
  key: string;
  name: string;
  icon: string;
  path: string;
  order: number;
  is_active: boolean;
  requires_permission: boolean;
}

export interface MenuCategory {
  id: number;
  key: string;
  name: string;
  icon: string;
  order: number;
  is_active: boolean;
  modules: MenuModule[];
}

export const menuService = {
  // Get user's accessible menu
  getUserMenu: async (): Promise<MenuCategory[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/menu/user-menu/`);
    return response.data;
  },

  // Get all categories and modules (admin)
  getAllCategories: async (): Promise<MenuCategory[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/menu/categories/`);
    return response.data;
  },

  // Get company menu access
  getCompanyAccess: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/menu/company-access/`);
    return response.data;
  },

  // Update company menu access
  updateCompanyAccess: async (moduleId: number, isEnabled: boolean) => {
    const response = await axios.post(`${API_BASE_URL}/api/menu/company-access/`, {
      module_id: moduleId,
      is_enabled: isEnabled
    });
    return response.data;
  }
};