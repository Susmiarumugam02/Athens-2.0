# Auto-Sync Service Tiers with Subscription Plan

## Problem
When subscription plan changes in Subscriptions module, service tier badges in Services page don't update automatically.

## Solution
Implemented Django signal to auto-update service tiers when subscription plan changes.

## Implementation

### 1. Signal Handler (`control_plane/signals.py`)
```python
@receiver(post_save, sender=Subscription)
def sync_service_tiers_on_subscription_change(sender, instance, created, **kwargs):
    """Auto-update service tiers when subscription plan changes"""
    if not created:  # Only on update
        plan_to_tier = {
            'Starter': 'starter',
            'Professional': 'professional',
            'Enterprise': 'enterprise'
        }
        new_tier = plan_to_tier.get(instance.plan_name)
        
        # Update all enabled services for this tenant
        TenantService.objects.filter(
            tenant=instance.tenant,
            is_enabled=True
        ).update(tier=new_tier)
```

### 2. App Config (`control_plane/apps.py`)
```python
def ready(self):
    import control_plane.signals  # Register signals
```

## How It Works

### Scenario: Change Subscription Plan
```
1. Superadmin edits subscription for "ABC Corp"
2. Changes plan from "Starter" to "Professional"
3. Saves subscription
   ↓
4. Signal fires: sync_service_tiers_on_subscription_change
   ↓
5. Finds all enabled services for ABC Corp
   ↓
6. Updates tier: starter → professional
   ↓
7. Services page automatically shows "professional" badges
```

### Example Flow
```
Before:
- Subscription: Starter
- ERGON service: enabled, tier=starter
- Workforce service: enabled, tier=starter

User Action:
- Edit subscription → change to "Professional"

After (automatic):
- Subscription: Professional
- ERGON service: enabled, tier=professional ✓
- Workforce service: enabled, tier=professional ✓
```

## Benefits

1. **Automatic Sync**: No manual tier updates needed
2. **Consistency**: Service tiers always match subscription plan
3. **Real-time**: Updates happen immediately on save
4. **Bulk Update**: All services updated in one query

## Testing

### Test 1: Update Subscription Plan
```bash
# Via Django Admin or API
PATCH /api/control-plane/subscriptions/1/
{
  "plan_name": "Enterprise"
}

# Check service tiers updated
GET /api/system/tenant-services/?tenant_id=5
# All services should show tier="enterprise"
```

### Test 2: Frontend Flow
```
1. Go to /superadmin/subscriptions
2. Click Edit on any subscription
3. Change plan: Starter → Professional
4. Save
5. Go to /superadmin/services
6. Verify tier badges show "professional"
```

## Files Modified

- `backend/control_plane/signals.py` (new)
- `backend/control_plane/apps.py`

## Deployment

No migration needed. Just restart backend:

```bash
sudo systemctl restart athens2-backend
```

## Status

✅ Signal handler created  
✅ App config updated  
✅ Auto-sync on subscription update  
⏳ Ready for deployment
