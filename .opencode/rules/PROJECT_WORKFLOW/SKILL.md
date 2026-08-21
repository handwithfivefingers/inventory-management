# Project Workflow - Inventory Management ERP/POS System

**Last Updated**: February 26, 2026  
**Version**: 2.0

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Development Workflow](#development-workflow)
5. [API Workflow](#api-workflow)
6. [Data Flow](#data-flow)
7. [Authentication & Authorization Flow](#authentication--authorization-flow)
8. [Database Workflow](#database-workflow)
9. [Build & Deployment](#build--deployment)
10. [Testing Workflow](#testing-workflow)

---

## Project Overview

This is a full-stack **Inventory Management ERP/POS System** built with a monorepo architecture. The system manages products, orders, warehouses, vendors, customers, invoices, and financial transactions with role-based access control (RBAC).

### Primary Source Code

- **Backend**: `backend-ts/` (Express 5 + TypeScript + Sequelize)
- **Frontend**: `client/` (Remix v2.15 + React 18 + TypeScript)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Remix Frontend (React 18 + TypeScript)              │   │
│  │  - Routes (File-based routing)                       │   │
│  │  - Components (Reusable UI)                          │   │
│  │  - Hooks (Custom logic)                              │   │
│  │  - Store (Zustand for state)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS (REST API)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express 5 Backend (TypeScript)                      │   │
│  │  - Routers (API endpoints)                           │   │
│  │  - Controllers (Business logic)                      │   │
│  │  - Services (Data operations)                        │   │
│  │  - Middleware (Auth, Validation, Error handling)     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Sequelize ORM
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  MySQL 8.0   │         │  Redis 7.4   │                 │
│  │  (Primary)   │         │  (Cache)     │                 │
│  └──────────────┘         └──────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (`client/`)

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Remix | v2.15 |
| UI Library | React | v18.2 |
| Language | TypeScript | v5.1.6 |
| State Management | Zustand | v5.0.1 |
| Forms | React Hook Form | v7.53.2 |
| Validation | Zod | v3.23.8 |
| Styling | Tailwind CSS | v4.1.13 |
| SCSS | Sass | v1.81.0 |
| Icons | Feather Icons | v4.29.2 |
| Number Formatting | react-number-format | v5.4.2 |
| HTTP Client | Fetch API | Native |
| Build Tool | Vite | v5.1.0 |

### Backend (`backend-ts/`)

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Express | v5.1.0 |
| Language | TypeScript | v5.8.3 |
| ORM | Sequelize | v6.37.7 |
| ORM Extension | Sequelize-TypeScript | v2.1.6 |
| Database | MySQL | v8.0 |
| Cache | Redis | v7.4 |
| Redis Client | ioredis | v5.6.1 |
| Authentication | JWT | v9.0.2 |
| Password Hashing | bcryptjs | v3.0.2 |
| Validation | express-validator | v7.2.1 |
| Security | Helmet | v8.1.0 |
| CORS | cors | v2.8.5 |
| Logging | morgan | v1.10.0 |
| Error Tracking | Sentry | v9.15.0 |
| File Upload | multer | v1.4.5-lts.2 |
| Excel | xlsx | v0.18.5 |
| QR Code | qrcode | v1.5.4 |
| Test Framework | Vitest | v3.1.2 |

### Infrastructure

| Service | Technology | Version |
|---------|-----------|---------|
| Containerization | Docker | Latest |
| Orchestration | Docker Compose | v3.9 |
| Database Admin | Adminer | Latest |

---

## Development Workflow

### 1. Environment Setup

```bash
# Clone repository
git clone <repository-url>
cd inventory-management

# Start database services
docker-compose up -d database redis adminer

# Install dependencies
cd backend-ts && yarn install
cd ../client && yarn install
```

### 2. Development Mode

```bash
# Terminal 1 - Backend
cd backend-ts
yarn dev  # Runs on http://localhost:3001

# Terminal 2 - Frontend
cd client
yarn dev  # Runs on http://localhost:3000
```

### 3. File Structure

```
inventory-management/
├── backend-ts/              # TypeScript Backend
│   ├── src/
│   │   ├── configs/         # App configuration (Redis, Sentry, DB)
│   │   ├── constant/        # Constants and enums
│   │   ├── controllers/     # Request handlers
│   │   ├── core/            # Core utilities
│   │   ├── database/        # Database models and associations
│   │   ├── libs/            # Shared libraries
│   │   ├── middleware/      # Express middleware
│   │   ├── response/        # Response handlers
│   │   ├── routers/         # API route definitions
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Entry point
│   ├── tests/               # Unit tests
│   └── package.json
│
├── client/                  # Remix Frontend
│   ├── app/
│   │   ├── action.client/   # Client-side service calls
│   │   ├── action.server/   # Server-side actions
│   │   ├── assets/          # Static assets
│   │   ├── components/      # Reusable components
│   │   ├── constants/       # Constants
│   │   ├── context/         # React context
│   │   ├── hooks/           # Custom hooks
│   │   ├── http/            # HTTP client
│   │   ├── libs/            # Shared libraries
│   │   ├── routes/          # File-based routes
│   │   ├── store/           # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   ├── root.tsx         # Root component
│   │   └── sessions.ts      # Session management
│   ├── public/              # Public assets
│   └── package.json
│
├── docker-compose.yml       # Docker services configuration
└── db/                      # Database scripts and configurations
```

---

## API Workflow

### Request Flow

```
Client → Route Loader/Action → HTTP Service → Backend API → Controller → Service → Database
                                                                 ↓
                                                              Redis Cache
```

### API Endpoints Structure

```
Base URL: http://localhost:3001/api

Authentication:
  POST   /auth/login       - User login
  POST   /auth/register    - User registration
  GET    /auth/me          - Get current user
  POST   /auth/logout      - User logout

Resources (All require authentication):
  /products                - Product management
  /orders                  - Order management
  /invoices                - Invoice management
  /customers               - Customer management
  /vendors                 - Vendor management
  /warehouses              - Warehouse management
  /providers               - Provider management
  /categories              - Category management
  /tags                    - Tag management
  /units                   - Unit management
  /financial               - Financial records
  /history                 - Audit history
  /roles                   - Role management
```

### Example API Call

```typescript
// Client-side service
import { http } from "~/http";

const productService = {
  getProducts: (params) => {
    const qs = new URLSearchParams(params);
    return http.get(`/products?${qs.toString()}`);
  },
  
  createProduct: (data) => {
    return http.post("/products", data);
  }
};

// Usage in route loader
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie");
  const products = await productService.getProducts({ cookie });
  return { products: products.data };
};
```

---

## Data Flow

### 1. User Login Flow

```
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌────────┐      ┌────────┐
│  User   │      │  Client  │      │  Backend │      │ MySQL  │      │ Redis  │
└────┬────┘      └────┬─────┘      └────┬─────┘      └───┬────┘      └───┬────┘
     │                │                  │                │               │
     │ Enter creds    │                  │                │               │
     │───────────────>│                  │                │               │
     │                │                  │                │               │
     │                │ POST /auth/login │                │               │
     │                │─────────────────>│                │               │
     │                │                  │                │               │
     │                │                  │ Find user      │               │
     │                │                  │───────────────>│               │
     │                │                  │                │               │
     │                │                  │ User data      │               │
     │                │                  │<───────────────│               │
     │                │                  │                │               │
     │                │                  │ Cache user     │               │
     │                │                  │──────────────────────────────>│
     │                │                  │                │               │
     │                │                  │ Generate JWT   │               │
     │                │                  │                │               │
     │                │ Set cookie +     │                │               │
     │                │ user data        │                │               │
     │                │<─────────────────│                │               │
     │                │                  │                │               │
     │ Logged in      │                  │                │               │
     │<───────────────│                  │                │               │
     │                │                  │                │               │
```

### 2. Data Fetching Flow (with Cache)

```typescript
// Backend service with caching
import Redis from '#/configs/redis';
import database from '#/database';

const { cacheItem, cacheKey } = Redis;

async function getProducts(req) {
  return await cacheItem({
    key: cacheKey('Products', req.locals.vendorId),
    callback: async () => {
      // Database query if cache miss
      return await database.product.findAll({
        where: { vendorId: req.locals.vendorId }
      });
    }
  });
}
```

### 3. State Management Flow (Frontend)

```typescript
// Zustand store for user state
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUser = create(
  persist(
    (set) => ({
      user: undefined,
      activeVendor: undefined,
      activeWarehouse: undefined,
      
      initialize: (userData) => set({ ...userData }),
      setVendor: (vendor) => set({ activeVendor: vendor }),
      setWarehouse: (warehouse) => set({ activeWarehouse: warehouse }),
      reset: () => set(initialState)
    }),
    { name: "user-storage" }
  )
);

// Usage in component
const { user, activeVendor, setVendor } = useUser();
```

---

## Authentication & Authorization Flow

### Authentication Flow

1. **Login**: User submits credentials → Backend validates → JWT token generated → Cookie set
2. **Session**: Cookie sent with every request → Middleware validates token → User info attached to request
3. **Logout**: Cookie cleared → Cache invalidated

### Authorization Flow (RBAC)

```typescript
// Backend middleware
const auth = async (req, res, next) => {
  const token = req.cookies.session;
  const payload = verifyToken(token);
  const user = await database.user.findByPk(payload.id);
  
  if (!user) throw new Error('Unauthorized');
  
  req.locals = { email: user.email, id: user.id };
  next();
};

// Frontend permission guard
<PermissionGuard permission="C" module="product">
  <Button>Create Product</Button>
</PermissionGuard>

// Frontend hook
const canCreate = usePermission('C', 'product');
```

### Permission Matrix

| Module | Create (C) | Read (R) | Update (U) | Delete (D) |
|--------|-----------|----------|-----------|-----------|
| Products | ✅ | ✅ | ✅ | ✅ |
| Orders | ✅ | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ | ✅ |
| Vendors | ✅ | ✅ | ✅ | ✅ |
| Warehouses | ✅ | ✅ | ✅ | ✅ |
| Financial | Admin only | Admin only | Admin only | Admin only |

---

## Database Workflow

### Database Models

```
User (1) ──────< (N) Vendor
Vendor (1) ────< (N) Warehouse
Vendor (1) ────< (N) Product
Vendor (1) ────< (N) Category
Vendor (1) ────< (N) Tag
Vendor (1) ────< (N) Unit

User >──── (M:N) Role
Role >──── (M:N) Permission

Product (1) ────< (N) OrderDetail
Product (1) ────< (N) InvoiceDetail
Product (1) ────< (N) Inventory
Product (1) ────< (N) Transfer

Order (1) ──────< (N) OrderDetail
Invoice (1) ────< (N) InvoiceDetail

Customer (1) ───< (N) Invoice
Warehouse (1) ──< (N) Inventory
Warehouse (1) ──< (N) Transfer
```

### Database Sync Workflow

```typescript
// backend-ts/src/index.ts
database
  .load()        // Load all models
  .then(() => database.sync())  // Sync with database (alter tables)
  .catch((error) => console.error('Sync error:', error));
```

---

## Build & Deployment

### Development

```bash
# Backend
cd backend-ts
yarn dev          # tsx with hot reload

# Frontend
cd client
yarn dev          # Remix Vite dev server
```

### Production Build

```bash
# Backend
cd backend-ts
yarn build        # Compile TypeScript to JavaScript
yarn start        # Run production server

# Frontend
cd client
yarn build        # Build for production
yarn start        # Start production server
```

### Docker Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Access Adminer (MySQL GUI)
# http://localhost:8080
```

---

## Testing Workflow

### Backend Tests

```bash
cd backend-ts

# Run all tests
yarn test

# Run with coverage
yarn coverage

# Run in watch mode
yarn test --watch

# Run specific test file
yarn test cache.test.ts
```

### Frontend Tests

```bash
cd client

# Type checking
yarn typecheck

# Linting
yarn lint
```

### Test File Structure

```
backend-ts/src/services/authenticate/__tests__/cache.test.ts
client/app/hooks/__tests__/use-permission.test.tsx
client/app/components/__tests__/permission-guard.test.tsx
```

---

## Key Features Implementation

### 1. Vendor/Warehouse Switcher

**Location**: `client/app/components/vendor-warehouse-switcher.tsx`

```typescript
// Automatically appears when user has multiple vendors/warehouses
// Click dropdown → Select vendor/warehouse → Selection persists in Zustand
```

### 2. Permission-Based Route Guards

**Location**: `client/app/components/permission-guard.tsx`

```tsx
// Show only if user can create products
<PermissionGuard permission="C" module="product">
  <Button>Create Product</Button>
</PermissionGuard>

// Check in component
const canEdit = usePermission('U', 'order');
const isAdmin = useIsAdmin();
```

### 3. Redis Caching

**Location**: `backend-ts/src/services/authenticate/cache.ts`

```typescript
// Login caching
const user = await cacheItem({
  key: cacheKey('User', email),
  callback: async () => {
    return await database.user.findOne({ where: { email } });
  }
});

// Cache invalidation on update
await cacheDel(cacheKey('User', userEmail));
```

---

## Environment Variables

### Backend (.env)

```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mysql
DB_NAME=inventory
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

### Frontend (.env)

```env
VITE_API_PATH=http://localhost:3001/api
```

---

## Common Workflows

### Adding a New Module

1. **Database Model**: Create model in `backend-ts/src/database/models/`
2. **Service**: Create service in `backend-ts/src/services/`
3. **Controller**: Create controller in `backend-ts/src/controllers/`
4. **Router**: Create router in `backend-ts/src/routers/`
5. **Frontend Types**: Add types in `client/app/types/`
6. **Frontend Service**: Create service in `client/app/action.client/`
7. **Frontend Route**: Create route in `client/app/routes/`
8. **Permissions**: Add permission guards to routes

### Debugging

```bash
# Check backend logs
docker-compose logs -f backend-ts

# Check database queries
# Look for Sequelize logging in backend console

# Check Redis cache
redis-cli
> KEYS *
> GET User:test@example.com
> DEL User:test@example.com

# Debug Sentry errors
# Visit http://localhost:3001/debug-sentry
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if MySQL is running
docker-compose ps

# Restart database
docker-compose restart database

# Check connection
mysql -h localhost -u root -p
```

### Redis Cache Issues

```bash
# Check if Redis is running
docker-compose ps redis

# Clear all caches
redis-cli FLUSHALL

# Restart Redis
docker-compose restart redis
```

### TypeScript Errors

```bash
# Backend
cd backend-ts
yarn type-check

# Client
cd client
yarn typecheck

# Fix common issues
# - Check import paths use correct aliases (#/ or ~/)
# - Ensure all files have .ts/.tsx extensions
# - Check type definitions match usage
```

---

## Best Practices

### Code Organization

- **Backend**: Follow Controller-Service-Repository pattern
- **Frontend**: Use Remix conventions (loaders, actions)
- **Types**: Define in separate `.ts` files
- **Tests**: Co-locate with source files in `__tests__/`

### Security

- Always validate input with `express-validator`
- Use parameterized queries (Sequelize handles this)
- Implement rate limiting for auth endpoints
- Use HTTPS in production
- Store secrets in environment variables

### Performance

- Cache frequently accessed data in Redis
- Use pagination for large datasets
- Implement lazy loading for components
- Optimize database queries with indexes

### Error Handling

- Use try-catch blocks in async operations
- Log errors with Sentry
- Return consistent error responses
- Show user-friendly error messages

---

## Support & Documentation

- **API Documentation**: See individual router files
- **Type Definitions**: See `client/app/types/` and `backend-ts/src/types/`
- **Component Documentation**: See Storybook (if available)
- **Test Examples**: See `__tests__/` directories

---

**Developed with ❤️ for Inventory Management ERP/POS**
