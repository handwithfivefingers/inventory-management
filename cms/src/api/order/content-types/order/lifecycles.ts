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
    const data = event.params.data;
    console.log("data", JSON.stringify(data, null, 2));
    // console.log("coming beforeCreate", data);
    // const { LogoSrc, BannerSrc, Description, MainContent } = data;
    // const urlLogoSplit = LogoSrc.replace("http://localhost:1111/", "");
    // const urlBannerSplit = BannerSrc.replace("http://localhost:1111/", "");
    // if (urlLogoSplit) {
    //   const targetLocation = path.join(
    //     path.dirname(""),
    //     "..",
    //     "..",
    //     "transfer",
    //     urlLogoSplit
    //   );
    //   const logoUploaded = await uploadImageToStrapi(targetLocation);
    //   data.Logo = logoUploaded.id;
    // }
    // if (urlBannerSplit) {
    //   const bannerLocation = path.join(
    //     path.dirname(""),
    //     "..",
    //     "..",
    //     "transfer",
    //     urlBannerSplit
    //   );
    //   const bannerUploaded = await uploadImageToStrapi(bannerLocation);
    //   data.Banner = bannerUploaded.id;
    // }
    // console.log("Prepare Parse Description");
    // const newDescription = await imageParser(Description);
    // console.log("Prepare Parse MainContent");
    // data.Description = newDescription;
    // event.params.data = data;
  },
  afterCreate: async (event) => {
    await handleUpdateProductStock({ strapi, event });
    // const { result } = event;
    // const result = {
    //   id: 2,
    //   documentId: "y9ysqcjhv1vv3tchybdrkzes",
    //   note: "sample",
    //   createdAt: "2024-11-26T09:01:56.473Z",
    //   updatedAt: "2024-11-26T09:01:56.473Z",
    //   publishedAt: "2024-11-26T09:01:56.526Z",
    //   locale: null,
    //   products: { count: 1 },
    //   createdBy: {
    //     id: 1,
    //     documentId: "k5gr47468u6bfoq3gn1je6is",
    //     firstname: "truyen",
    //     lastname: "mai",
    //     username: null,
    //     email: "handgod1995@gmail.com",
    //     password: "$2a$10$PlgcSyp9q85zH90MJI6G1ORTQGoi..PSKPQ4RzGCYg4.YQuOb8HNS",
    //     resetPasswordToken: null,
    //     registrationToken: null,
    //     isActive: true,
    //     blocked: false,
    //     preferedLanguage: null,
    //     createdAt: "2024-11-26T03:35:04.697Z",
    //     updatedAt: "2024-11-26T03:35:04.697Z",
    //     publishedAt: "2024-11-26T03:35:04.697Z",
    //     locale: null,
    //   },
    //   updatedBy: {
    //     id: 1,
    //     documentId: "k5gr47468u6bfoq3gn1je6is",
    //     firstname: "truyen",
    //     lastname: "mai",
    //     username: null,
    //     email: "handgod1995@gmail.com",
    //     password: "$2a$10$PlgcSyp9q85zH90MJI6G1ORTQGoi..PSKPQ4RzGCYg4.YQuOb8HNS",
    //     resetPasswordToken: null,
    //     registrationToken: null,
    //     isActive: true,
    //     blocked: false,
    //     preferedLanguage: null,
    //     createdAt: "2024-11-26T03:35:04.697Z",
    //     updatedAt: "2024-11-26T03:35:04.697Z",
    //     publishedAt: "2024-11-26T03:35:04.697Z",
    //     locale: null,
    //   },
    //   localizations: [],
    // };
    // console.log("afterCreate", JSON.stringify(result, null, 2));
    // const newMainContent = {
    //   Name: result.MainContent.Name,
    //   ContentGame: [],
    // };
    // if (result.MainContent.Name?.length) {
    //   for (let item of result.MainContent.ContentGame) {
    //     const contentParsed = await imageParser(item.Content);
    //     newMainContent.ContentGame.push({
    //       Name: item.Name,
    //       Content: contentParsed,
    //     });
    //   }
    // }
    // await strapi.entityService.update(
    //   "api::categories-post.categories-post",
    //   result.id,
    //   {
    //     data: {
    //       MainContent: newMainContent,
    //       publishedAt: Date.now(),
    //     },
    //   }
    // );
  },
};
