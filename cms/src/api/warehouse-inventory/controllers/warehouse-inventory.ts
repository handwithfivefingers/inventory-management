/**
 * A set of functions called "actions" for `warehouse-inventory`
 */

export default {
  findInventoryByWarehouseId: async (ctx, next) => {
    try {
      const resp = await strapi.service("api::warehouse-inventory.warehouse-inventory").findInventoryByWarehouseId(ctx);
      ctx.body = {
        data: resp,
      };
      // return strapi.service("api::warehouse-inventory.warehouse-inventory").findInventoryByWarehouseId(ctx);
    } catch (err) {
      ctx.body = err;
    }
  },
};
