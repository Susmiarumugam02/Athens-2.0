# TODO - Incident Management Voice Assistant (Production-grade)

- [x] Implement session locking + duplicate prevention in `frontend/src/pages/incidentmanagement/components/IncidentForm.tsx`
- [x] Fix transcript commit logic: only commit finalized speech; de-dupe by committed key
- [x] Stabilize textarea auto-fill
- [x] Improve confidence filtering and multilingual locale handling
- [x] Harden UI/voice states (Listening/Processing/Captured/Mic inactive) and ensure clean stop/restart

# Considering Parameters + Auto-Fill System — COMPLETE ✅

## Infrastructure (built in previous session)
- [x] `frontend/src/hooks/useConsideringParameters.ts` — Central parameter state, dependency narrowing, form memory, backend sync
- [x] `frontend/src/hooks/useAutoFill.ts` — Auto-fill engine: maps parameters + AI result → form fields per module
- [x] `frontend/src/hooks/useVoiceAutoFill.ts` — Voice → parameter detection (department, work type, risk, site, shift)
- [x] `frontend/src/components/ConsideringParametersPanel.tsx` — Reusable panel replacing "Project" selectors
- [x] `frontend/src/components/SmartRecommendationPanel.tsx` — Side panel: hazards, PPE, checklist, AI notes, similar records
- [x] `backend/system/considering_parameters.py` — Parameter options, auto-fill derivation, smart recommendations
- [x] `backend/system/views.py` — 3 new endpoints: GET /considering-parameters/, POST /autofill/, POST /smart-recommendations/
- [x] `backend/system/urls.py` — Routes registered

## Module Integrations — ALL COMPLETE ✅
- [x] `IncidentForm.tsx` — ConsideringParametersPanel + SmartRecommendationPanel (reference integration)
- [x] `SafetyObservationForm.tsx` — ConsideringParametersPanel + SmartRecommendationPanel, department/location/contractor sync
- [x] `TBTForm.tsx` — ConsideringParametersPanel, work_area/training_type/description sync
- [x] `TrainingForm.tsx` — ConsideringParametersPanel, training_type/department/location sync + department filter auto-set
- [x] `InspectionFormSelector.tsx` — ConsideringParametersPanel, auto-filters form list by department→category mapping
- [x] `TaskManagementPage.tsx` — ConsideringParametersPanel, parameterDefaults wired into Create modal initial values
- [x] `QualityFindingsFixingsSystem.tsx` — ConsideringParametersPanel inside finding modal (collapsed by default), department/work_area/severity/corrective_action sync on modal open
