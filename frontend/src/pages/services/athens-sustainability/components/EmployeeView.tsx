import React from 'react'
import { X, User, Building, Mail, Phone, MapPin, Calendar, DollarSign, Award, Shield, BarChart3 } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Employee } from '../types/employeeTypes'

interface EmployeeViewProps {
  employee: Employee
  onClose: () => void
}

const EmployeeView: React.FC<EmployeeViewProps> = ({ employee, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'on_leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Team Member Details
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header with Profile */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6">
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{employee.full_name}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">{employee.designation_title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">{employee.employee_id} • {employee.department_name}</p>
                <div className="flex items-center space-x-3 mt-3">
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(employee.status)}`}>
                    {employee.status}
                  </span>
                  <span className={`px-3 py-1 text-sm rounded-full ${getRiskColor(employee.retention_risk)}`}>
                    {employee.retention_risk} risk
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{employee.performance_score}/10</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Performance Score</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-green-500" />
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.date_of_birth || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{employee.gender || 'Not specified'}</p>
                </div>
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
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.department_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Designation</p>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.designation_title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date of Joining</p>
                  <p className="font-medium text-gray-900 dark:text-white">{new Date(employee.date_of_joining).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Base Salary</p>
                  <p className="font-medium text-gray-900 dark:text-white">₹{employee.base_salary.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Employment Type</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{employee.employment_type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Work Mode</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{employee.work_mode}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills & Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-purple-500" />
                  <span>Skills & Expertise</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employee.skills && employee.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No skills listed</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Performance Score</span>
                    <span className="text-sm font-medium">{employee.performance_score}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(employee.performance_score / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Engagement Score</span>
                    <span className="text-sm font-medium">{employee.engagement_score}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(employee.engagement_score / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Address Information */}
          {(employee.address_line1 || employee.city || employee.state) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  <span>Address Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 dark:text-white">
                  {employee.address_line1 && <p>{employee.address_line1}</p>}
                  {employee.address_line2 && <p>{employee.address_line2}</p>}
                  <p>
                    {[employee.city, employee.state, employee.pincode].filter(Boolean).join(', ')}
                  </p>
                  {employee.country && <p>{employee.country}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact */}
          {employee.emergency_contact_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-red-500" />
                  <span>Emergency Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.emergency_contact_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Relationship</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{employee.emergency_contact_relationship}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.emergency_contact_phone}</p>
                </div>
                {employee.emergency_contact_address && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                    <p className="font-medium text-gray-900 dark:text-white">{employee.emergency_contact_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmployeeView