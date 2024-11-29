import { errors } from "@strapi/utils";

const { ApplicationError } = errors;

export const getUserVendors = async (documentId: string) => {
  try {
    const user = await strapi.documents("plugin::users-permissions.user").findOne({
      documentId,
      populate: ["vendors"],
    });
    return user;
  } catch (error) {
    throw new ApplicationError(error);
  }
};

export const getWarehouseByVendorId = async (documentId: string) => {
  try {
    return await strapi.documents("api::warehouse.warehouse").findMany({
      populate: ["vendor"],
      filters: {
        vendor: {
          documentId: {
            $eq: documentId,
          },
        },
      },
    });
  } catch (error) {
    throw new ApplicationError(error);
  }
};
