# Service Tier Management - Cheat Sheet

## Quick Commands

### Change All Services
```bash
cd /var/www/athens-2.0/backend && source .venv/bin/activate

# To basic
python manage.py change_service_tier "Renew Power" all basic

# To premium
python manage.py change_service_tier "Renew Power" all premium

# To enterprise
python manage.py change_service_tier "Renew Power" all enterprise
```

### Change Specific Service
```bash
# ERGON
python manage.py change_service_tier "Renew Power" ergon premium

# Workforce
python manage.py change_service_tier "Renew Power" workforce enterprise

# Contractor Compliance
python manage.py change_service_tier "Renew Power" contractor-compliance basic
```

### View Current Tiers
```bash
python manage.py shell -c "from control_plane.models import TenantService, Tenant; t = Tenant.objects.get(name='Renew Power'); [print(f'{ts.service.name}: {ts.tier}') for ts in TenantService.objects.filter(tenant=t, is_enabled=True)]"
```

---

## Tier Features

| Feature | Basic | Premium | Enterprise |
|---------|-------|---------|------------|
| Core Features | ✅ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ |
| Automation | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| Multi-site | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| Dedicated Support | ❌ | ❌ | ✅ |

---

## Pricing

- **Basic**: $0/month per service
- **Premium**: $99/month per service
- **Enterprise**: $299/month per service

---

## Common Tasks

**New trial tenant**:
```bash
python manage.py change_service_tier "New Company" all basic
```

**Upgrade to premium**:
```bash
python manage.py change_service_tier "Company Name" all premium
```

**Enterprise customer**:
```bash
python manage.py change_service_tier "Enterprise Corp" all enterprise
```

**Mix tiers**:
```bash
python manage.py change_service_tier "Company" ergon enterprise
python manage.py change_service_tier "Company" workforce premium
```

---

## Where Tiers Show

- **Services Page**: Badge under each enabled service
- **Database**: `tenant_services.tier` column
- **API**: `tier` field in tenant service response

---

## Documentation

Full guide: `MANAGING_SERVICE_TIERS_GUIDE.md`
