export const transferService = {
  updateTransfer: async ({ prevQuantity, currentQuantity, productId, type, warehouseId }) => {
    const entries = await strapi.documents("api::transfer.transfer").create({
      data: {
        quantity: prevQuantity,
        updatedQuantity: currentQuantity,
        type,
        product: productId,
        sentDate: new Date(),
        receivedDate: new Date(),
        warehouse: warehouseId,
      },
    });
    return entries;
  },
};
