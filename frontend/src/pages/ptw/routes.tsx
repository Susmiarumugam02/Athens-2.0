import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RoleBasedRoute from '../../app/RoleBasedRoute';
import PermitList from './components/PermitList';
import EnhancedPermitForm from './components/EnhancedPermitForm';
import PermitDetail from './components/PermitDetail';
import ComplianceDashboard from './components/ComplianceDashboard';
import WorkflowTaskDashboard from './components/WorkflowTaskDashboard';
import PTWKPIDashboard from './components/PTWKPIDashboard';
import PTWLayout from './components/PTWLayout';
import PTWReports from './components/PTWReports';
import MobilePermitApp from './components/MobilePermitApp';
import PTWStandardPrint from './components/PTWStandardPrint';

const PTWRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="print/:id"
        element={
          <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
            <PTWStandardPrint />
          </RoleBasedRoute>
        }
      />
      <Route element={<PTWLayout />}>
        <Route 
          index 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <PermitList />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="create" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'epc','client','contractor']}>
              <EnhancedPermitForm />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="edit/:id" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <EnhancedPermitForm />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="view/:id" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <PermitDetail />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="dashboard" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <ComplianceDashboard />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="kpi" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <PTWKPIDashboard />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="reports" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <PTWReports />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="pending-approvals" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <WorkflowTaskDashboard />
            </RoleBasedRoute>
          } 
        />
        <Route 
          path="mobile" 
          element={
            <RoleBasedRoute allowedRoles={['clientuser', 'epcuser', 'contractoruser', 'client','epc','contractor']}>
              <MobilePermitApp />
            </RoleBasedRoute>
          } 
        />
      </Route>
    </Routes>
  );
};

export default PTWRoutes;



