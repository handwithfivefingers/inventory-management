// @ts-nocheck

const handleUpdateProductStock = async ({ strapi, event }) => {
  const doc = await strapi.documents("api::order.order").findOne({
    documentId: event.result.documentId,
    populate: {
      ["OrderItem"]: {
        populate: {
          product: {
            populate: ["productDetails", "history"],
          },
        },
      },
    },
  });

  if (doc.OrderItem) {
    for (let order of doc.OrderItem) {
      let { product, quantity } = order;
      const { productDetails, history } = product;
      const { inStock, sold, id, ...rest } = productDetails;

      let newSold = (sold || 0) + quantity;
      let newInStock = undefined;
      let newHistory = history?.length ? history.map(({ id, ...item }) => item) : [];
      if (typeof inStock !== undefined && Number(inStock) > 0) {
        newInStock = (inStock || 0) - quantity;
      }

      newHistory.push({ inStock, sold, ...rest });

      if (product.documentId) {
        const documentData = {
          productDetails: {
            ...productDetails,
            inStock: newInStock,
            sold: newSold,
          },
          history: newHistory,
        };
        const resp = await strapi.documents("api::product.product").update({
          documentId: product.documentId,
          data: documentData,
        });
      }
    }
  }
};
module.exports = {
  beforeCreate: async (event) => {
    // console.log("Before Create", JSON.stringify(event, null, 2));
    // const data = event.params.data;
    // console.log("data", JSON.stringify(data, null, 2));
  },
  afterCreate: async (event) => {
    // await handleUpdateProductStock({ strapi, event });
  },
};
