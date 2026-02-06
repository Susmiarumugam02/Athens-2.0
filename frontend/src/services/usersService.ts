import apiClient from '../lib/api'

export interface User {
  id: number
  email: string
  user_type: string
  is_active: boolean
}

class UsersService {
  async listUsers(params?: { company?: string }) {
    const response = await apiClient.get<User[]>('/auth/users/', { params })
    return response.data
  }
}

export const usersService = new UsersService()
