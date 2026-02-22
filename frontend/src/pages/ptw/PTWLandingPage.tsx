import { useNavigate } from 'react-router-dom'

export default function PTWLandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Permit to Work (PTW)</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            onClick={() => navigate('/app/ptw/permits')}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition"
          >
            <h3 className="text-xl font-semibold mb-2">Permits</h3>
            <p className="text-gray-600">View and manage work permits</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow opacity-50">
            <h3 className="text-xl font-semibold mb-2">Approvals</h3>
            <p className="text-gray-600">Coming soon</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow opacity-50">
            <h3 className="text-xl font-semibold mb-2">Reports</h3>
            <p className="text-gray-600">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
