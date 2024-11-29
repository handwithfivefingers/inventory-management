export const getProductById = async (documentId: string, populateParams?: any) => {
  const populate = {
    populate: ["productDetails"],
    ...populateParams,
  };
  return strapi.documents("api::product.product").findOne({
    documentId,
    ...populate,
  });
};

export const createWareHouse = async (data) => {
  return strapi.documents("api::inventory.inventory").create({
    data,
  });
};

export const onAfterProductUpdate = async ({ productId, warehouseId, beforeStock, transferType }) => {
  const prod = await getProductById(productId);

  const { productDetails }: Record<any, any> = prod || { productDetails: { inStock: 0 } };
  console.log("productDetails?.inStock", productDetails?.inStock);
  const inventoryItem = await strapi.documents("api::inventory.inventory").findFirst({
    filters: {
      product: {
        documentId: {
          $eq: prod.documentId,
        },
      },
      warehouse: {
        documentId: {
          $eq: warehouseId,
        },
      },
    },
  });

  const updatedStock = beforeStock - inventoryItem.quantity;

  await strapi.documents("api::inventory.inventory").update({
    documentId: inventoryItem.documentId,
    data: {
      quantity: productDetails?.inStock || 0,
    },
  });
  if (updatedStock !== 0) {
    await strapi.documents("api::transfer.transfer").create({
      data: {
        quantity: Number(updatedStock),
        updatedQuantity: beforeStock,
        product: prod.documentId,
        type: transferType,
        receivedDate: new Date(),
        sentDate: new Date(),
      },
    });
  }
};
export const onAfterProductCreate = async ({ warehouses, warehouseId, productId, quantity }) => {
  try {
    let listCreateInstance = [];
    const prod = await getProductById(productId);
    const { productDetails }: Record<any, any> = prod || { productDetails: { inStock: 0 } };
    if (!warehouses.length) throw new Error("Warehouses not found");
    for (let wHouse of warehouses) {
      const isMatchWarehouse = wHouse.documentId === warehouseId;
      const params = {
        product: prod.documentId,
        quantity: isMatchWarehouse ? quantity : 0,
        warehouse: wHouse.documentId,
      };
      listCreateInstance.push(createWareHouse(params));
    }
    return Promise.all(listCreateInstance);
  } catch (error) {
    await strapi.documents("api::product.product").delete({
      documentId: productId, // documentId,
    });
    console.log("rollback due to failed", error);
  }
};
