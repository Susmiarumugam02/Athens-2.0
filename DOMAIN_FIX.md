# Domain Configuration Fix

## Issue Found

The project contained hardcoded references to `prozeal.athenas.co.in` from a previous project template.

## Files Fixed

### Backend
1. `/var/www/athens-2.0/backend/ptw/signature_service.py`
   - Changed: `https://prozeal.athenas.co.in` → `https://ai-athens.cloud`

2. `/var/www/athens-2.0/backend/ptw/export_utils.py`
   - Changed: `https://prozeal.athenas.co.in` → `https://ai-athens.cloud`

### Remaining References (Legacy Fields - DO NOT REMOVE)

These are database model fields for inspection forms and should NOT be changed:
- `/var/www/athens-2.0/backend/inspection/models_forms.py`
  - `prozeal_name_sig` - Field name for signature
  - `prozeal_signature` - Field name for signature data
  
**Note**: These are field names in the database schema, not domain references. Changing them would break existing data.

## Configuration

The application now uses environment variables for domain configuration:

```bash
# Backend (.env)
SITE_URL=https://ai-athens.cloud
FRONTEND_BASE_URL=https://ai-athens.cloud

# Frontend (.env)
VITE_API_URL=https://ai-athens.cloud
```

## Current Domain

**Production**: `https://ai-athens.cloud` or `https://www.ai-athens.cloud`

## Why This Happened

The Athens 2.0 project was built using code from a previous project (Prozeal) as a template. Some hardcoded values were not replaced during the initial setup.

## Verification

To verify the fix:
1. Check PTW module signature generation
2. Check export functionality
3. Ensure no references to old domain in logs

## Future Prevention

- Always use environment variables for domain/URL configuration
- Never hardcode domains in source code
- Use `settings.SITE_URL` or `os.getenv('SITE_URL')` instead
