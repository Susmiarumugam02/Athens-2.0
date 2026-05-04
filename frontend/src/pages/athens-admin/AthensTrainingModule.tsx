import React, { useState } from 'react'
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Plus, 
  Eye, 
  QrCode, 
  UserCheck, 
  Edit, 
  Trash2,
  Calendar,
  MapPin,
  Clock,
  User,
  X,
  Save,
  Camera
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

interface Training {
  id: number
  title: string
  date: string
  location: string
  conducted_by: string
  status: 'planned' | 'completed' | 'cancelled'
  duration?: number
  duration_unit?: 'minutes' | 'hours'
  description?: string
  join_code?: string
  qr_token?: string
}

const AthensTrainingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('induction')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCodesModal, setShowCodesModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [attendanceData, setAttendanceData] = useState<{[key: string]: boolean}>({})
  const [trainings, setTrainings] = useState<Training[]>([
    {
      id: 1,
      title: 'Site Safety Induction',
      date: '2024-01-15',
      location: 'Main Conference Room',
      conducted_by: 'John Smith',
      status: 'planned',
      duration: 60,
      duration_unit: 'minutes',
      description: 'Comprehensive safety training for new site workers',
      join_code: '123456',
      qr_token: 'abc123def456'
    },
    {
      id: 2,
      title: 'Equipment Operation Training',
      date: '2024-01-12',
      location: 'Workshop Area',
      conducted_by: 'Sarah Johnson',
      status: 'completed',
      duration: 90,
      duration_unit: 'minutes',
      description: 'Training on heavy equipment operation',
      join_code: '789012',
      qr_token: 'def789ghi012'
    }
  ])
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    conducted_by: '',
    duration: activeTab === 'tbt' ? 30 : 60,
    duration_unit: 'minutes' as 'minutes' | 'hours',
    description: ''
  })

  const trainingTabs = [
    { id: 'induction', label: 'Induction Training', icon: Users, description: 'Mandatory safety training for new workers' },
    { id: 'job', label: 'Job Training', icon: BookOpen, description: 'Specialized job-specific training' },
    { id: 'tbt', label: 'Toolbox Talk', icon: MessageSquare, description: 'Short safety discussions' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const canEdit = (training: Training) => training.status === 'planned'
  const canDelete = (training: Training) => training.status === 'planned'
  const canShowCodes = (training: Training) => training.status !== 'completed'
  const canConduct = (training: Training) => training.status !== 'completed' && training.status !== 'cancelled'

  const handleCreate = () => {
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      conducted_by: '',
      duration: activeTab === 'tbt' ? 30 : 60,
      duration_unit: 'minutes',
      description: ''
    })
    setSelectedTraining(null)
    setShowCreateModal(true)
  }

  const handleEdit = (training: Training) => {
    setFormData({
      title: training.title,
      date: training.date,
      location: training.location,
      conducted_by: training.conducted_by,
      duration: training.duration || 60,
      duration_unit: training.duration_unit || 'minutes',
      description: training.description || ''
    })
    setSelectedTraining(training)
    setShowCreateModal(true)
  }

  const handleSave = () => {
    if (!formData.title || !formData.date || !formData.location || !formData.conducted_by) {
      toast.error('Please fill in all required fields')
      return
    }

    const newTraining: Training = {
      id: selectedTraining?.id || Date.now(),
      title: formData.title,
      date: formData.date,
      location: formData.location,
      conducted_by: formData.conducted_by,
      status: 'planned',
      duration: activeTab !== 'job' ? formData.duration : undefined,
      duration_unit: activeTab !== 'job' ? formData.duration_unit : undefined,
      description: formData.description,
      join_code: Math.floor(100000 + Math.random() * 900000).toString(),
      qr_token: Math.random().toString(36).substring(2, 15)
    }

    if (selectedTraining) {
      setTrainings(prev => prev.map(t => t.id === selectedTraining.id ? newTraining : t))
      toast.success('Training updated successfully')
    } else {
      setTrainings(prev => [...prev, newTraining])
      toast.success('Training created successfully')
    }
    setShowCreateModal(false)
  }

  const handleDelete = (training: Training) => {
    if (window.confirm('Are you sure you want to delete this training?')) {
      setTrainings(prev => prev.filter(t => t.id !== training.id))
      toast.success('Training deleted successfully')
    }
  }

  const handleViewDetails = (training: Training) => {
    setSelectedTraining(training)
    setShowDetailModal(true)
  }

  const handleShowCodes = (training: Training) => {
    setSelectedTraining(training)
    setShowCodesModal(true)
  }

  const handleConductAttendance = (training: Training) => {
    setSelectedTraining(training)
    setShowAttendanceModal(true)
  }

  const handleCompleteTraining = () => {
    if (selectedTraining) {
      setTrainings(prev => prev.map(t => 
        t.id === selectedTraining.id ? { ...t, status: 'completed' as const } : t
      ))
      toast.success('Training completed successfully')
      setShowAttendanceModal(false)
      setCapturedImage(null)
      setAttendanceData({})
    }
  }

  const handleEvidencePhoto = async () => {
    setIsCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()
      
      setTimeout(() => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        stream.getTracks().forEach(track => track.stop())
        toast.success('Evidence photo captured successfully')
      }, 2000)
    } catch (error) {
      toast.error('Failed to access camera')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleMarkPresent = async (participantName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()
      
      setTimeout(() => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0)
        canvas.toDataURL('image/jpeg')
        
        // Simulate face recognition validation
        const isValidated = Math.random() > 0.2 // 80% success rate for demo
        
        if (isValidated) {
          setAttendanceData(prev => ({ ...prev, [participantName]: true }))
          toast.success(`${participantName} marked present - Face validated`)
        } else {
          toast.error(`Face validation failed for ${participantName}`)
        }
        
        stream.getTracks().forEach(track => track.stop())
      }, 2000)
    } catch (error) {
      toast.error('Failed to access camera for face recognition')
    }
  }

  const renderTrainingList = () => {
    const filteredTrainings = trainings

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {trainingTabs.find(tab => tab.id === activeTab)?.label}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {trainingTabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
          <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Training
          </Button>
        </div>

        {/* Training Cards */}
        <div className="grid gap-6">
          {filteredTrainings.map((training) => (
            <div key={training.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {training.title}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(training.status)}`}>
                      {training.status.charAt(0).toUpperCase() + training.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {training.description}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(training.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span>{training.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span>{training.conducted_by}</span>
                    </div>
                    {training.duration && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>{training.duration} {training.duration_unit}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button size="sm" variant="outline" onClick={() => handleViewDetails(training)} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>
                
                {canShowCodes(training) && (
                  <Button size="sm" variant="outline" onClick={() => handleShowCodes(training)} className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Check-in Codes
                  </Button>
                )}
                
                {canConduct(training) && (
                  <Button size="sm" onClick={() => handleConductAttendance(training)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Conduct & Take Attendance
                  </Button>
                )}
                
                {canEdit(training) && (
                  <Button size="sm" variant="outline" onClick={() => handleEdit(training)} className="flex items-center gap-2 text-green-600 hover:text-green-700">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                
                {canDelete(training) && (
                  <Button size="sm" variant="outline" onClick={() => handleDelete(training)} className="flex items-center gap-2 text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTrainings.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              {(() => {
                const tab = trainingTabs.find(t => t.id === activeTab)
                const Icon = tab?.icon || Users
                return <Icon className="h-8 w-8 text-gray-400" />
              })()}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No {trainingTabs.find(tab => tab.id === activeTab)?.label} Sessions
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first training session to get started
            </p>
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Training
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Training Type Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {trainingTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Training Content */}
      {renderTrainingList()}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedTraining ? 'Edit' : 'Create'} {trainingTabs.find(tab => tab.id === activeTab)?.label}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter training title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conducted By *</label>
                <input
                  type="text"
                  value={formData.conducted_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, conducted_by: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter conductor name"
                />
              </div>
              {activeTab !== 'job' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration *</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                    <select
                      value={formData.duration_unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_unit: e.target.value as 'minutes' | 'hours' }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                {selectedTraining ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Training Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{selectedTraining.title}</h4>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedTraining.status)}`}>
                  {selectedTraining.status.charAt(0).toUpperCase() + selectedTraining.status.slice(1)}
                </span>
              </div>
              {selectedTraining.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTraining.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <p className="text-gray-600 dark:text-gray-400">{new Date(selectedTraining.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTraining.location}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conducted By</label>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTraining.conducted_by}</p>
                </div>
                {selectedTraining.duration && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                    <p className="text-gray-600 dark:text-gray-400">{selectedTraining.duration} {selectedTraining.duration_unit}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Codes Modal */}
      {showCodesModal && selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Check-in Codes</h3>
              <button onClick={() => setShowCodesModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 text-center space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PIN Code</label>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 bg-gray-100 dark:bg-gray-700 rounded-lg py-4">
                  {selectedTraining.join_code}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">QR Code</label>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg py-8 px-4">
                  <QrCode className="h-24 w-24 mx-auto text-gray-400" />
                  <p className="text-xs text-gray-500 mt-2">QR Code: {selectedTraining.qr_token}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Codes expire in 7 days from creation
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowCodesModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conduct Training & Take Attendance</h3>
              <button onClick={() => setShowAttendanceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{selectedTraining.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(selectedTraining.date).toLocaleDateString()} • {selectedTraining.location}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-gray-900 dark:text-white">Eligible Participants</h5>
                  <Button 
                    size="sm" 
                    onClick={handleEvidencePhoto}
                    disabled={isCapturing}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isCapturing ? 'Capturing...' : 'Evidence Photo'}
                  </Button>
                </div>
                
                {capturedImage && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Evidence Photo Captured</p>
                    <img src={capturedImage} alt="Evidence" className="w-full h-32 object-cover rounded-lg" />
                  </div>
                )}
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Face recognition attendance system ready.
                    {activeTab === 'induction' ? ' Workers with "initiated" status will be shown.' : ' Only induction-trained personnel eligible.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mock participants */}
                  {['John Doe', 'Jane Smith', 'Mike Johnson'].map((name, index) => {
                    const isPresent = attendanceData[name]
                    return (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                        isPresent ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isPresent ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-300 dark:bg-gray-600'
                          }`}>
                            <User className={`h-5 w-5 ${
                              isPresent ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                            }`} />
                          </div>
                          <div>
                            <span className={`text-sm font-medium ${
                              isPresent ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-white'
                            }`}>{name}</span>
                            {isPresent && (
                              <p className="text-xs text-green-600 dark:text-green-400">Face Validated ✓</p>
                            )}
                          </div>
                        </div>
                        {!isPresent ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleMarkPresent(name)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            Mark Present
                          </Button>
                        ) : (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">Present</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowAttendanceModal(false)}>Cancel</Button>
              <Button onClick={handleCompleteTraining} className="bg-green-600 hover:bg-green-700 text-white">
                Complete Training
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AthensTrainingModule