import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../lib/api'
import { 
  Building2, MapPin, Phone, Mail, Globe, FileText, 
  Upload, X, Save, AlertCircle, CheckCircle2, Image as ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CompanyDetails {
  company_name: string
  registered_address: string
  contact_email: string
  contact_phone: string
  website: string
  tax_id: string
  registration_number: string
  company_logo?: string
}

interface CompanyDocument {
  id: number
  name: string
  type: string
  file_url: string
  uploaded_at: string
}

export default function CompanySettings() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState<CompanyDetails>({
    company_name: '',
    registered_address: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    tax_id: '',
    registration_number: '',
  })
  const [documents, setDocuments] = useState<CompanyDocument[]>([])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  useEffect(() => {
    loadCompanyDetails()
    loadDocuments()
  }, [])

  const loadCompanyDetails = async () => {
    try {
      const response = await apiClient.get('/api/company/details/')
      setDetails(response.data)
      if (response.data.company_logo) {
        setLogoPreview(response.data.company_logo)
      }
    } catch (error) {
      console.error('Failed to load company details:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const response = await apiClient.get('/api/company/documents/')
      setDocuments(response.data)
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      console.log('Saving company details:', details)
      const response = await apiClient.put('/api/company/details/', details)
      console.log('Save response:', response.data)
      toast.success('Company details updated successfully')
    } catch (error: any) {
      console.error('Save error:', error)
      console.error('Error response:', error.response?.data)
      toast.error(error.response?.data?.error || 'Failed to update details')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    try {
      const response = await apiClient.post('/api/company/logo/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setLogoPreview(response.data.logo_url)
      toast.success('Logo uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload logo')
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    const formData = new FormData()
    formData.append('document', file)
    formData.append('name', file.name)

    try {
      const response = await apiClient.post('/api/company/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setDocuments([...documents, response.data])
      toast.success('Document uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload document')
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await apiClient.delete(`/api/company/documents/${docId}/`)
      setDocuments(documents.filter(d => d.id !== docId))
      toast.success('Document deleted')
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company details and documents</p>
      </div>

      {/* Company Logo */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Company Logo
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="Company Logo" 
                className="h-24 w-24 rounded-xl object-cover border-2 border-border"
              />
            ) : (
              <div className="h-24 w-24 rounded-xl bg-accent flex items-center justify-center border-2 border-dashed border-border">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer transition-colors">
              <Upload className="h-4 w-4" />
              Upload Logo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-2">PNG, JPG up to 2MB</p>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={details.company_name}
              onChange={(e) => setDetails({ ...details, company_name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Registration Number
            </label>
            <input
              type="text"
              value={details.registration_number}
              onChange={(e) => setDetails({ ...details, registration_number: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter registration number"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Registered Address *
            </label>
            <textarea
              value={details.registered_address}
              onChange={(e) => setDetails({ ...details, registered_address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter registered address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Contact Email *
            </label>
            <input
              type="email"
              value={details.contact_email}
              onChange={(e) => setDetails({ ...details, contact_email: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="contact@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Contact Phone *
            </label>
            <input
              type="tel"
              value={details.contact_phone}
              onChange={(e) => setDetails({ ...details, contact_phone: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Website
            </label>
            <input
              type="url"
              value={details.website}
              onChange={(e) => setDetails({ ...details, website: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tax ID / GST Number
            </label>
            <input
              type="text"
              value={details.tax_id}
              onChange={(e) => setDetails({ ...details, tax_id: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter tax ID"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Company Documents
          </h2>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer transition-colors">
            <Upload className="h-4 w-4" />
            {uploadingDoc ? 'Uploading...' : 'Upload Document'}
            <input 
              type="file" 
              onChange={handleDocumentUpload}
              disabled={uploadingDoc}
              className="hidden"
            />
          </label>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-4 bg-accent/50 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
