import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    title: 'Inventory Management API',
    description: 'API Spec được sinh tự động - Inventory Management System',
    version: '1.0.0'
  },
  basePath: '/',
  host: 'localhost:3000',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'JWT Bearer token via cookie `session` or header `Authorization: Bearer <token>`'
    },
    cookieAuth: {
      type: 'apiKey',
      name: 'session',
      in: 'cookie',
      description: 'Session cookie set after login'
    }
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication & session' },
    { name: 'Vendors', description: 'Vendor management' },
    { name: 'Orders', description: 'Sales orders' },
    { name: 'ImportOrders', description: 'Import / purchase orders' },
    { name: 'Products', description: 'Products & variants' },
    { name: 'ProductAttributes', description: 'Product attributes & values' },
    { name: 'Providers', description: 'Suppliers / providers' },
    { name: 'Warehouses', description: 'Warehouses' },
    { name: 'Categories', description: 'Product categories' },
    { name: 'Tags', description: 'Product tags' },
    { name: 'Units', description: 'Units of measure' },
    { name: 'Financial', description: 'Financial vouchers & reports' },
    { name: 'Stats', description: 'Dashboard statistics' },
    { name: 'History', description: 'Product stock history' },
    { name: 'Roles', description: 'Roles & permissions' },
    { name: 'Customers', description: 'Customers' },
    { name: 'Invoices', description: 'Invoices' },
    { name: 'Staff', description: 'Staff management' },
    { name: 'Shifts', description: 'Shift open/close' },
    { name: 'Settings', description: 'Vendor settings' },
    { name: 'Permissions', description: 'Permission catalog' }
  ],
  definitions: {
    PaginationQuery: {
      limit: 10,
      offset: 0,
      vendorId: 1
    },
    LoginBody: {
      $email: 'admin@example.com',
      $password: 'password123'
    },
    RegisterBody: {
      $email: 'new@example.com',
      $password: 'password123',
      name: 'New User'
    },
    VendorBody: {
      $name: 'My Vendor',
      address: '123 Street',
      phone: '0123456789'
    },
    ProviderBody: {
      $name: 'ACME Supplier',
      email: 'supplier@example.com',
      phone: '0123456789',
      address: '123 Street'
    },
    WarehouseBody: {
      $name: 'Main Warehouse',
      address: '123 Street',
      phone: '0123456789',
      email: 'warehouse@example.com',
      isMain: true
    },
    CategoryBody: {
      $name: 'Electronics',
      description: 'Electronic products'
    },
    TagBody: {
      $name: 'Hot',
      vendorId: 1
    },
    UnitBody: {
      $name: 'Piece',
      vendorId: 1
    },
    ProductBody: {
      $name: 'Product A',
      sku: 'SKU001',
      categoryId: 1,
      unitId: 1,
      price: 100000
    },
    OrderBody: {
      warehouseId: 1,
      customerId: 1,
      paymentType: 'cash',
      items: [{ productVariantId: 1, quantity: 2, price: 100000 }]
    },
    CustomerBody: {
      $name: 'John Doe',
      phone: '0123456789',
      email: 'customer@example.com',
      address: '123 Street'
    },
    InvoiceBody: {
      orderId: 1,
      paymentType: 'cash'
    },
    FinancialVoucherBody: {
      type: 'income',
      amount: 1000000,
      description: 'Sales revenue',
      warehouseId: 1
    },
    RoleBody: {
      $name: 'Manager',
      description: 'Manager role',
      permissions: ['product:C', 'order:R']
    }
  }
}

const outputFile = '../swagger-output.json'
const routesInProject = ['../src/index.ts'] // Đường dẫn tới file khởi chạy Express của bạn

// Chạy hàm sinh ra file spec JSON
swaggerAutogen()(outputFile, routesInProject, doc)
