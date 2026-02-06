import React, { useState, useEffect } from 'react'
import { X, Save, User, Building } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Employee, Department, Designation, EmployeeFormData } from '../types/employeeTypes'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface EmployeeFormProps {
  employee?: Employee
  onClose: () => void
  onSave: (employee: Employee) => void
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onClose, onSave }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])

  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    department: 0,
    designation: 0,
    employment_type: 'full_time',
    work_mode: 'office',
    date_of_joining: '',
    base_salary: 0,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    aadhar_number: '',
    pan_number: '',
    pf_number: '',
    uan_number: '',
    esi_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_branch: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    emergency_contact_address: '',
    skills: [],
    profile_picture: undefined,
    face_photo: undefined,
    capture_face_photo: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [skillsText, setSkillsText] = useState<string>('')
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        date_of_birth: employee.date_of_birth || '',
        gender: employee.gender || '',
        department: employee.department || 0,
        designation: employee.designation || 0,
        employment_type: employee.employment_type || 'full_time',
        work_mode: employee.work_mode || 'office',
        date_of_joining: employee.date_of_joining || '',
        base_salary: employee.base_salary || 0,
        address_line1: employee.address_line1 || '',
        address_line2: employee.address_line2 || '',
        city: employee.city || '',
        state: employee.state || '',
        pincode: employee.pincode || '',
        country: employee.country || 'India',
        aadhar_number: employee.aadhar_number || '',
        pan_number: employee.pan_number || '',
        pf_number: employee.pf_number || '',
        uan_number: employee.uan_number || '',
        esi_number: employee.esi_number || '',
        bank_name: employee.bank_name || '',
        bank_account_number: employee.bank_account_number || '',
        bank_ifsc_code: employee.bank_ifsc_code || '',
        bank_branch: employee.bank_branch || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_relationship: employee.emergency_contact_relationship || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        emergency_contact_address: employee.emergency_contact_address || '',
        skills: Array.isArray(employee.skills) ? employee.skills : [],
        profile_picture: undefined,
        face_photo: undefined,
        capture_face_photo: false
      })





      setSkillsText(Array.isArray(employee.skills) ? employee.skills.join(', ') : '')
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        department: 0,
        designation: 0,
        employment_type: 'full_time',
        work_mode: 'office',
        date_of_joining: '',
        base_salary: 0,
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        aadhar_number: '',
        pan_number: '',
        pf_number: '',
        uan_number: '',
        esi_number: '',
        bank_name: '',
        bank_account_number: '',
        bank_ifsc_code: '',
        bank_branch: '',
        emergency_contact_name: '',
        emergency_contact_relationship: '',
        emergency_contact_phone: '',
        emergency_contact_address: '',
        skills: [],
        profile_picture: undefined,
        face_photo: undefined,
        capture_face_photo: false
      })


      setSkillsText('')
      setErrors({})
    }
  }, [employee])

  useEffect(() => {
    if (sessionKey) {
      fetchDropdownData()
    }
  }, [sessionKey])

  useEffect(() => {
    if (formData.department) {
      fetchDesignations(formData.department)
    }
  }, [formData.department])

  const fetchDropdownData = async () => {
    if (!sessionKey) return

    setLoadingDropdowns(true)
    try {
      const response = await api.get('/api/athens-sustainability/dropdown/departments/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      
      setDepartments(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching dropdown data:', error)
      toast.error('Failed to load form data')
    } finally {
      setLoadingDropdowns(false)
    }
  }

  const fetchDesignations = async (departmentId: number) => {
    if (!sessionKey) return

    try {
      const response = await api.get('/api/athens-sustainability/dropdown/designations/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { department_id: departmentId, session_key: sessionKey }
      })
      setDesignations(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching designations:', error)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.gender?.trim()) newErrors.gender = 'Gender is required'
    if (!formData.department) newErrors.department = 'Department is required'
    if (!formData.designation) newErrors.designation = 'Designation is required'
    if (!formData.date_of_joining) newErrors.date_of_joining = 'Joining date is required'
    if (!formData.base_salary || formData.base_salary <= 0) newErrors.base_salary = 'Valid salary is required'

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the form errors')
      return
    }

    setLoading(true)
    try {
      const url = employee 
        ? `/api/athens-sustainability/employees/${employee.id}/`
        : '/api/athens-sustainability/employees/'
      
      const method = employee ? 'put' : 'post'
      
      const submitData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'skills') {
          const skillsArray = Array.isArray(value) ? value : []
          submitData.append(key, JSON.stringify(skillsArray))
        } else if (key === 'profile_picture' || key === 'face_photo') {
          if (value instanceof File) {
            submitData.append(key, value)
          }
        } else if (key !== 'capture_face_photo' && value !== undefined && value !== '') {
          submitData.append(key, value.toString())
        }
      })
      submitData.append('session_key', sessionKey || '')
      
      const response = await api[method](url, submitData, {
        headers: { 
          Authorization: `Bearer ${sessionKey}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.success(employee ? 'Team member updated successfully' : 'Team member created successfully')
      onSave(response.data)
      onClose()
    } catch (error: any) {
      console.error('Error saving employee:', error)
      toast.error('Failed to save team member')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSkillsChange = (text: string) => {
    setSkillsText(text)
    const skillsArray = text.split(',').map(skill => skill.trim()).filter(skill => skill)
    handleInputChange('skills', skillsArray)
  }



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {employee ? 'Edit Team Member' : 'Add New Team Member'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-500" />
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Joining *
                </label>
                <input
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.date_of_joining ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.date_of_joining && <p className="text-red-500 text-xs mt-1">{errors.date_of_joining}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-500" />
                <span>Employment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', parseInt(e.target.value))}
                  disabled={loadingDropdowns}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.department ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">{loadingDropdowns ? 'Loading departments...' : 'Select Department'}</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Designation *
                </label>
                <select
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.designation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={!formData.department}
                >
                  <option value="">Select Designation</option>
                  {designations.map(desig => (
                    <option key={desig.id} value={desig.id}>{desig.title}</option>
                  ))}
                </select>
                {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Salary (₹) *
                </label>
                <input
                  type="number"
                  value={formData.base_salary}
                  onChange={(e) => handleInputChange('base_salary', parseFloat(e.target.value) || 0)}
                  placeholder="50000"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.base_salary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  min="0"
                  step="1000"
                />
                {errors.base_salary && <p className="text-red-500 text-xs mt-1">{errors.base_salary}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Mode
                </label>
                <select
                  value={formData.work_mode}
                  onChange={(e) => handleInputChange('work_mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="office">Office</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Skills & Expertise (comma-separated)
                </label>
                <textarea
                  value={skillsText}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                  placeholder="e.g., Sustainability Analysis, Environmental Consulting, Carbon Footprint Assessment"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
                {formData.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-green-500 to-emerald-600">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {employee ? 'Update Team Member' : 'Create Team Member'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeForm