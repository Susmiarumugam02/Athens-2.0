import { useState } from 'react';
import { Send } from 'lucide-react';

interface NotificationDelivery {
  id: number;
  announcement: number;
  announcement_title: string;
  user: number;
  user_email: string;
  delivery_status: string;
  delivered_at: string | null;
  read_at: string | null;
}

export default function DeliveryTrackingTable() {
  const [deliveries] = useState<NotificationDelivery[]>([]);
  const [loading] = useState(false);

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/20 text-green-400';
      case 'read': return 'bg-blue-500/20 text-blue-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-400">Track announcement delivery and read status</p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Send className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-400">No delivery records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Announcement</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Recipient</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Delivered At</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Read At</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-white">{delivery.announcement_title}</td>
                    <td className="py-3 px-4 text-gray-300">{delivery.user_email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(delivery.delivery_status)}`}>
                        {delivery.delivery_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{formatDate(delivery.delivered_at)}</td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{formatDate(delivery.read_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
