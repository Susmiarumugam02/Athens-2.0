# Project Business Rules - Athens 2.0

## Core Rule: ONE Client, ONE or MULTIPLE EPCs

### Data Model
```
Project {
  client_company_id: UUID          // Single client (ONE only)
  epc_company_ids: [UUID]          // Array of EPCs (ONE or MULTIPLE)
  subscriber_role: 'client' | 'epc'
}
```

### Business Logic

#### 1. Client as Subscriber
- **Client**: ONE (pays subscription)
- **EPCs**: MULTIPLE allowed
- **Use Case**: Client hires multiple EPC contractors

#### 2. EPC as Subscriber  
- **EPC**: ONE (pays subscription, is itself)
- **Client**: ONE (the customer)
- **Use Case**: EPC provides service to one client

### Validation Rules

✅ **Enforced**:
- `client_company_id` is single UUID field → only ONE client possible
- If `subscriber_role == 'epc'` → `epc_company_ids.length` must be ≤ 1

✅ **Allowed**:
- If `subscriber_role == 'client'` → `epc_company_ids` can have multiple entries

### Database Schema
- `client_company_id`: UUIDField (single value)
- `epc_company_ids`: JSONField (array)
- `contractor_company_ids`: JSONField (array)

### Admin Creation Flow
When creating project admins:
- **Client Admin**: ONE per project (linked to `client_company_id`)
- **EPC Admins**: ONE or MULTIPLE (linked to `epc_company_ids`)
- **Contractor Admins**: MULTIPLE (linked to `contractor_company_ids`)

### Example Scenarios

**Scenario 1: Client Subscriber**
```json
{
  "subscriber_role": "client",
  "client_company_id": "uuid-client-a",
  "epc_company_ids": ["uuid-epc-1", "uuid-epc-2", "uuid-epc-3"]
}
```
✅ Valid: Client can have multiple EPCs

**Scenario 2: EPC Subscriber**
```json
{
  "subscriber_role": "epc",
  "client_company_id": "uuid-client-b",
  "epc_company_ids": ["uuid-epc-4"]
}
```
✅ Valid: EPC has one client, is itself the only EPC

**Scenario 3: Invalid - EPC with Multiple EPCs**
```json
{
  "subscriber_role": "epc",
  "client_company_id": "uuid-client-c",
  "epc_company_ids": ["uuid-epc-5", "uuid-epc-6"]
}
```
❌ Invalid: EPC subscriber cannot have multiple EPCs

### Status
✅ Implemented in models and serializers
✅ Validation enforced
✅ Migration applied
✅ Backend running with correct logic
