# Inventory Management System

## Project Overview

This is a full-stack inventory management system built with a monorepo architecture. The project manages products, orders, warehouses, vendors, categories, and financial transactions.

### Architecture

- **Frontend**: Remix v2.15 (React 18.2) with TypeScript
- **Backend**: Two versions available:
  - `backend/`: Express.js with Sequelize ORM (Deprecated)
  - `backend-ts/`: Express 5 with Sequelize-TypeScript (TypeScript)
- **Database**: MySQL 8.0 + Redis 7.4
- **UI Components**: Shared package at `packages/ui` (React + Storybook)
- **Containerization**: Docker Compose for database services

## Directory Structure

```
inventory-management/
├── backend/          # Express + Sequelize backend (primary)
├── backend-ts/       # Express 5 + Sequelize-TypeScript backend (alternative)
├── client/           # Remix frontend application
├── packages/ui/      # Shared UI component library
├── db/               # Database configuration and scripts
└── docker-compose.yml
```

## Building and Running

### Prerequisites

- Node.js >= 20.0.0
- Yarn 1.22.22+
- Docker & Docker Compose

### 1. Start Database Services

```bash
docker-compose up -d database redis adminer
```

- MySQL: `localhost:3306` (root/mysql)
- Redis: `localhost:6379`
- Adminer: `localhost:8080`

### 2. Backend (Primary - `backend/`)

```bash
cd backend
yarn install
yarn dev  # Development with nodemon
yarn build # Production build
yarn start # Production start
```

**Server**: http://localhost:3001

**Path Aliases**:
- `@/` or `@src/` → `src/`
- `@db/` → `src/database/`
- `@api/` → `src/api/`
- `@libs/` → `src/libs/`
- `@middleware/` → `src/middleware/`
- `@config/` → `src/config/`

### 3. Frontend (`client/`)

```bash
cd client
yarn install
yarn dev  # Development server
yarn build # Production build
yarn start # Production start
```

**Server**: http://localhost:3000

### 4. UI Package (`packages/ui/`)

```bash
cd packages/ui
yarn install
yarn dev  # Vite dev server
yarn storybook # Storybook development
```

### 5. Alternative Backend (`backend-ts/`)

```bash
cd backend-ts
yarn install
yarn dev  # Development with tsx
yarn build # Production build
yarn start # Production start
yarn test  # Vitest
```

## API Endpoints

Base URL: `http://localhost:3001/api`

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `/auth` | No | Authentication |
| `/permission` | Yes | Permission management |
| `/role` | Yes | Role management |
| `/products` | Yes | Product CRUD |
| `/vendors` | Yes | Vendor management |
| `/warehouses` | Yes | Warehouse management |
| `/providers` | Yes | Provider management |
| `/orders` | Yes | Order management |
| `/import-order` | Yes | Import order management |
| `/categories` | Yes | Category management |
| `/tags` | Yes | Tag management |
| `/units` | Yes | Unit management |
| `/financial` | Yes | Financial records |
| `/history` | Yes | Audit history |
| `/qr` | No | QR code generation |

## Database Models

- User, Role, Permission
- Product, Category, Tag, Unit
- Order, OrderDetail
- Vendor, Provider, Warehouse
- Transfer, Setting, Inventory

## Development Conventions

### Code Style

- **Backend**: ESLint + Prettier (configured in `eslint.config.mjs`, `.prettierrc`)
- **Frontend**: ESLint + Prettier
- **TypeScript**: Strict mode enabled

### Git Hooks

- `backend-ts/` uses Husky for pre-commit hooks

### Testing

- `backend-ts/`: Vitest (`yarn test`)
- `packages/ui/`: Storybook for component documentation

## Key Libraries

### Frontend
- **State**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS 4 + SCSS
- **Icons**: Feather Icons
- **Formatting**: react-number-format
- **Barcode**: JSBarcode, Quagga

### Backend
- **ORM**: Sequelize 6
- **Auth**: JWT + bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Monitoring**: Sentry
- **File Upload**: Multer
- **Excel**: xlsx

## MySQL Configuration

SQL mode adjustment (if needed):
```sql
SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));
```

## Environment Variables

Create `.env` files based on project needs. Default database credentials:
- Host: `localhost`
- Database: `inventory`
- Username: `root`
- Password: `mysql`

## Notes

- The `backend/` folder uses CommonJS with TypeScript compilation
- The `backend-ts/` folder uses ES Modules with tsx
- Both backends serve similar purposes but with different architectural approaches
- CORS is configured to allow `http://localhost:3000` and `http://localhost:5173`
