/**
 * product service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService("api::product.product", ({ strapi }) => ({
  async find(params) {
    console.log("params", params);
    const resp = await super.find(params);
    const { results, pagination } = resp;
    if (params.warehouse) {
      for (let item of results) {
        const { inventory } = item;
        const matchInventory = this.getInventoryByWarehouseID({ id: params.warehouse, data: inventory });
        console.log("matchInventory", matchInventory);
        if (matchInventory) {
          item.quantity = matchInventory.quantity;
        }
      }
    }
    return resp;
  },

  getInventoryByWarehouseID({ id, data }) {
    if (!data?.length) return false;
    for (let item of data) {
      console.log("item", item);
      if (item.warehouse?.documentId === id) return item;
    }
    return false;
  },
}));
