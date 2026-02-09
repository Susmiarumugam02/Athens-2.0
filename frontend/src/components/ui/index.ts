// Athens UI - Canonical Barrel Export
// SAP UI components are now the DEFAULT across Athens
// This file provides backward compatibility for all existing imports

// Primary exports: SAP UI Components
export * from '@/ui/sap';

// Legacy Athens UI available under namespace for emergency rollback
export * as ATHENS_UI_LEGACY from '@/components/ui-legacy/Button';
