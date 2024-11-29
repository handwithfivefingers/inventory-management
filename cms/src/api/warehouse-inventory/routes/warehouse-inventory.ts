export default {
  routes: [
    {
     method: 'GET',
     path: '/warehouse-inventory',
     handler: 'warehouse-inventory.findInventoryByWarehouseId',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
