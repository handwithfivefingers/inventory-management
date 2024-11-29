/**
 * warehouse-inventory service
 */

const WAREHOUSE_DOCS = "api::warehouse.warehouse";
const INVENTORY_DOCS = "api::inventory.inventory";

export default () => ({
  findInventoryByWarehouseId: async (ctx) => {
    const warehouses = await strapi.documents(WAREHOUSE_DOCS).findMany({
      limit: 99999,
      start: 0,
    });

    const result: Record<string, any> = {};

    const inventory = await Promise.all(
      warehouses.map((warehouse) =>
        strapi.documents(INVENTORY_DOCS).findMany({
          limit: 99999,
          start: 0,
          filters: {
            warehouse: {
              documentId: {
                $eq: warehouse.documentId,
              },
            },
          },
        })
      )
    );

    for (let warehouse of warehouses) {
    }

    /**
     * 2 Warehouse:
     * CREATE Product<1>:
     * -> warehouse<1>: stock 8
     * --> inventory<1>: Stock = 8 <-> warehouse<1>
     * --> inventory<1>: Stock = 8 <-> product<1>
     * -> warehouse<2>: stock 4
     * --> inventory<2>: stock = 4 <-> warehouse<2>
     * --> inventory<2>: stock = 4 <-> product<2>
     * ---> Product Relation Inventory: 1 <-> 2
     *
     * CREATE Product<2>:
     * -> warehouse<1>: stock 0
     * --> inventory<3>: Stock = 0 <-> warehouse<2>
     * --> inventory<3>: Stock = 0 <-> product<2>
     * -> warehouse<2>: stock 0
     * --> inventory<4>: stock = 0 <-> warehouse<2>
     * --> inventory<4>: stock = 0 <-> product<2>
     * ---> Product Relation Inventory: 1 <-> 2
     *
     *
     * UPDATE Product<2>:
     * -> warehouse<1>: stock 2
     * --> inventory<3>: Stock = 2 <-> warehouse<2>
     *
     */
    return result;
  },
});
