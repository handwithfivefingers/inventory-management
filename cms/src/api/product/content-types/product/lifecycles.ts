import { errors } from "@strapi/utils";

const { ApplicationError } = errors;

export default {
  beforeCreate: async (event) => {
    const ctx = strapi.requestContext.get();
    console.log("ctx", ctx);
    // const params = ctx.query()
    console.log("ctx.query", ctx.query);
    const { warehouses } = ctx.query;

    if (!warehouses) {
      ctx.response.status = 400;
      throw new ApplicationError("Warehouse are not defined");
    }
  },
  afterCreate: async (event) => {
    const ctx = strapi.requestContext.get();
    const prod = await strapi.documents("api::product.product").findOne({
      documentId: event.result.documentId,
      populate: ["productDetails"],
    });
    const { warehouses } = ctx.query;
    const { productDetails }: Record<any, any> = prod || { productDetails: { inStock: 0 } };
    if (!warehouses) {
      ctx.response.status = 400;
      throw new ApplicationError("Warehouse are not defined");
    }

    await strapi.documents("api::inventory.inventory").create({
      data: {
        product: prod.documentId,
        quantity: productDetails?.inStock,
        warehouses: [warehouses as string],
      },
    });
  },
};
