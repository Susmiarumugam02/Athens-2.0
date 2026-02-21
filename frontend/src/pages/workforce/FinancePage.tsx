import { useState, useEffect } from 'react'
import { workforceApi } from '../../services/workforceApi'

export default function FinancePage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    workforceApi.getInvoices()
      .then(res => setInvoices(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Finance</h1>
      <div className="bg-white rounded-lg shadow p-4">
        {invoices.length === 0 ? (
          <p className="text-gray-500">No invoices yet</p>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv: any) => (
              <li key={inv.id} className="border-b pb-2">
                <div className="font-semibold">{inv.invoice_number}</div>
                <div className="text-sm text-gray-600">${inv.total_amount} - {inv.status}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
