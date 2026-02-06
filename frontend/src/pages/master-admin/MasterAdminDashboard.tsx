import React from 'react'
import MasterAdminLayout from '../../layouts/MasterAdminLayout'
import { Card } from '../../components/ui/Card'
import { FolderKanban } from 'lucide-react'

const MasterAdminDashboardPage: React.FC = () => {
  return (
    <MasterAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your projects and settings</p>
        </div>

        <Card className="rounded-2xl p-12">
          <div className="text-center">
            <FolderKanban className="w-16 h-16 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Projects Dashboard
            </h3>
            <p className="text-muted-foreground mb-4">
              Project management and quick actions will be available here
            </p>
            <p className="text-sm text-muted-foreground">
              This will be implemented before PTW module development
            </p>
          </div>
        </Card>
      </div>
    </MasterAdminLayout>
  )
}

export default MasterAdminDashboardPage
