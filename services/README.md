# Microservices Architecture

This directory contains the microservices implementation for Phase 4 compliance.

## Services

- `auth-service/` - Authentication and authorization service
- `gateway/` - API Gateway (routes requests to services)
- `admin-service/` - Admin portal APIs
- `customer-service/` - Customer portal APIs
- `vendor-service/` - Vendor portal APIs (if needed)
- `agent-service/` - Agent portal APIs (if needed)

## Architecture

```
Client → Gateway → Service
         ↓
    Validates JWT
    Sets X-User-* headers
    Routes to service
```

## Ports

- Gateway: 4000
- Auth Service: 5000
- Admin Service: 5001
- Customer Service: 5002
- Vendor Service: 5003 (if needed)
- Agent Service: 5004 (if needed)
