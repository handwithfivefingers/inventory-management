const db = require("@db");

module.exports = {
  userInfoMiddleware: async (req, res, next) => {
    try {
      console.log("---> userInfoMiddleware ");
      const userId = req.locals.user.id;
      const resp = await db.user.findOne({
        where: {
          id: userId,
        },
        include: [
          {
            model: db.vendor,
            include: {
              model: db.warehouse,
            },
          },
        ],
      });

      const { vendors } = resp;
      const availableVendors = [];
      const availableWarehouses = [];
      for (let vendor of vendors) {
        availableVendors.push(vendor.id);
        if (vendor.warehouses.length) {
          for (let warehouse of vendor.warehouses) {
            availableWarehouses.push(warehouse.id);
          }
        }
      }
      req.availableVendors = availableVendors;
      req.availableWarehouses = availableWarehouses;
      next();
    } catch (error) {
      throw error;
    }
  },
};
