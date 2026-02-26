# Testing Guide

## Overview
This document describes the test suite for the Inventory Management System's authentication, permission, and caching features.

## Test Files

### Frontend Tests

#### 1. Permission Hooks Tests
**File**: `client/app/hooks/__tests__/use-permission.test.tsx`

Tests the following hooks:
- `usePermission(code, module)` - Check specific permission
- `useResourcePermission(resource, action)` - Resource-based checks
- `useIsAdmin()` - Check admin role
- `useHasRole(roleNames)` - Check specific roles
- `useAllPermissions()` - Get all user permissions

**Run Tests**:
```bash
cd client
npm test -- use-permission.test.tsx
# or
yarn test use-permission.test.tsx
```

#### 2. Permission Guard Component Tests
**File**: `client/app/components/__tests__/permission-guard.test.tsx`

Tests the following components:
- `<PermissionGuard>` - Conditional rendering based on permissions
- `<PermissionButton>` - Permission-aware button component

**Run Tests**:
```bash
cd client
npm test -- permission-guard.test.tsx
# or
yarn test permission-guard.test.tsx
```

### Backend Tests

#### 3. Redis Cache Service Tests
**File**: `backend-ts/src/services/authenticate/__tests__/cache.test.ts`

Tests the following:
- `cacheItem()` - Cache with callback
- `cacheKey()` - Key generation
- Cache hit/miss scenarios
- Custom TTL support
- Error handling

**Run Tests**:
```bash
cd backend-ts
npm test -- cache.test.ts
# or
yarn test cache.test.ts
```

## Running All Tests

### Frontend (Client)
```bash
cd client
npm test
# or
yarn test
```

### Backend (backend-ts)
```bash
cd backend-ts
npm test
# or
yarn test
```

## Test Coverage

### Generate Coverage Report
```bash
# Frontend
cd client
npm run coverage

# Backend
cd backend-ts
npm run coverage
```

## Test Structure

### Permission Hook Tests
```typescript
describe('Permission Hooks', () => {
  describe('usePermission', () => {
    it('should return true when user has the required permission', () => {
      // Test implementation
    })
  })
  
  describe('useResourcePermission', () => {
    it('should check resource-specific permissions', () => {
      // Test implementation
    })
  })
})
```

### Component Tests
```typescript
describe('PermissionGuard Component', () => {
  it('should render children when user has permission', () => {
    // Test implementation
  })
  
  it('should render fallback when provided', () => {
    // Test implementation
  })
})
```

### Cache Service Tests
```typescript
describe('Redis Cache Service', () => {
  describe('cacheItem', () => {
    it('should return cached data if available', async () => {
      // Test implementation
    })
    
    it('should call callback and cache result if not cached', async () => {
      // Test implementation
    })
  })
})
```

## Mocking

### Mock User Data
```typescript
const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  roles: [
    {
      id: 1,
      name: 'Admin',
      permissions: [
        { id: 1, name: 'product', C: true, R: true, U: true, D: true }
      ]
    }
  ]
}
```

### Mock Redis
```typescript
vi.mock('#/configs/redis', () => ({
  default: {
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
    cacheDel: vi.fn(),
    cacheKey: vi.fn((...args: string[]) => args.join(':'))
  }
}))
```

### Mock User Store
```typescript
vi.mock('~/store/user.store', () => ({
  useUser: vi.fn()
}))
```

## Test Scenarios

### Permission Tests
1. ✅ User has required permission
2. ❌ User lacks required permission
3. ✅ Admin user bypasses checks
4. ✅ Multiple roles with different permissions
5. ❌ No roles assigned
6. ❌ Undefined user

### Cache Tests
1. ✅ Cache hit - return cached data
2. ✅ Cache miss - call callback and cache
3. ✅ Custom TTL
4. ❌ Callback error handling
5. ✅ Cache key generation
6. ✅ Cache invalidation

### Component Tests
1. ✅ Render with permission
2. ❌ Hide without permission
3. ✅ Show fallback UI
4. ✅ Button enabled/disabled states
5. ✅ onClick handlers
6. ✅ Multiple conditions (AND logic)

## Continuous Integration

### Add to CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: yarn install
      
      - name: Run frontend tests
        run: cd client && yarn test:run
      
      - name: Run backend tests
        run: cd backend-ts && yarn test:run
```

## Writing New Tests

### Best Practices
1. **Descriptive test names**: Use clear, descriptive test case names
2. **Arrange-Act-Assert**: Structure tests with clear sections
3. **Mock external dependencies**: Don't test Redis/Database directly
4. **Test edge cases**: Null, undefined, empty arrays
5. **Keep tests independent**: Each test should run in isolation

### Example Test Template
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks()
  })

  it('should do something', () => {
    // Arrange
    const mockData = { ... }
    vi.mocked(dependency).mockReturnValue(mockData)

    // Act
    const result = renderHook(() => myHook())

    // Assert
    expect(result.current).toBe(expectedValue)
  })

  it('should handle error case', () => {
    // Test error scenarios
  })
})
```

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Cannot find module"
**Solution**: Ensure path aliases are configured in `vitest.config.js` or `tsconfig.json`

**Issue**: Mocks not working
**Solution**: Make sure `vi.mock()` is called at the top of the file, before imports

**Issue**: Tests timeout
**Solution**: Increase timeout or mock async operations properly
```typescript
vi.setConfig({ testTimeout: 10000 })
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [React Hook Form Testing](https://react-hook-form.com/get-started#Testing)
