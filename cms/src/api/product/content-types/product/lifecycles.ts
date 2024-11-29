import { errors } from "@strapi/utils";
import { onAfterProductCreate, onAfterProductUpdate } from "../../../../services/common.services";
import { transferService } from "../../../../services/transfer.service";
import { getUserVendors, getWarehouseByVendorId } from "../../../../services/component.service";

const { ApplicationError } = errors;

export default {
  beforeCreate: async (event) => {
    const ctx = strapi.requestContext.get();
    const { vendorId } = ctx.query;

    if (!ctx.state.user) throw new ApplicationError("User not found");

    const user = await getUserVendors(ctx.state.user.documentId);
    console.log("user", user);
    if (!user) throw new ApplicationError("User not found");

    const vendorIndex = (user as any)?.vendors?.findIndex((vendor) => vendor.documentId === vendorId);
    if (!(user as any)?.vendors?.length && vendorIndex === -1) {
      throw new Error("Vendor not found");
    }

    const warehouses = await getWarehouseByVendorId(vendorId as string);
    if (!warehouses.length) throw new ApplicationError("Warehouse not found");
    ctx.state.warehouses = warehouses;
  },
  afterCreate: async (event) => {
    const ctx = strapi.requestContext.get();
    const { warehouseId, quantity } = ctx.query;
    const type = "IMPORT";
    const inventoryEntries = await onAfterProductCreate({
      warehouses: ctx.state.warehouses,
      warehouseId,
      productId: event.result.documentId,
      quantity,
    });
    if (inventoryEntries?.length > 0) {
      let promiseAll = [];
      for (let inventory of inventoryEntries) {
        promiseAll.push(
          transferService.updateTransfer({
            prevQuantity: 0,
            currentQuantity: inventory.quantity,
            productId: event.result.documentId,
            warehouseId,
            type,
          })
        );
      }
      return Promise.all(promiseAll);
    }
    return;
  },
  beforeUpdate: async (event) => {
    // const ctx = strapi.requestContext.get();
    // const { warehouse, vendor } = ctx.query;
    // const isWareHouseExist = await strapi.documents("api::warehouse.warehouse").findOne({
    //   documentId: warehouse as string,
    //   filters: {
    //     vendor: {
    //       documentId: {
    //         $eq: vendor as string,
    //       },
    //     },
    //   },
    // });
    // if (!isWareHouseExist) throw new ApplicationError("Warehouse not found");
    // event.state.warehouse = warehouse;
    // // REPLACE FIELD
    // console.log("event", ctx.request.body);
    // event.state.inStock = ctx.request.body.data?.productDetails?.inStock;
    // event.state.type = "UPDATE";
  },
  afterUpdate: async (event) => {
    try {
      // const { warehouse, inStock, type } = event.state;
      // console.log("event.state", event.state);
      // return onAfterProductUpdate({
      //   productId: event.result.documentId,
      //   warehouseId: warehouse,
      //   beforeStock: inStock,
      //   transferType: type,
      // });
      // TRANSFER HERE
    } catch (error) {
      console.log("Failed update inventory", error);
      throw new ApplicationError(error);
    }
  },
};
