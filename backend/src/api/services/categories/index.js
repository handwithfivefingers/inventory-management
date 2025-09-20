/**
 * @TABLE: Inventory
 * @DESCRIPTION: Middle table - Connection Between Product and Warehouse
 */

const db = require("@db");
const BaseCRUDService = require("@constant/base");

module.exports = class CategoriesService extends BaseCRUDService {
  constructor() {
    super("category");
  }
  async create(params) {
    try {
      const instance = await this.createInstance(params);
      return instance;
    } catch (error) {
      throw error;
    }
  }

  async update(req) {
    try {
      const instance = await this.category.update(
        {
          name: req.body.name,
        },
        {
          where: {
            id: req.params.id,
          },
        }
      );
      return instance;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieve all categories by vendorId
   *
   * @param {{ vendorId: string }} params - The parameters containing the vendorId.
   * @returns {Promise<Object[]>} - The categories.
   *
   * @throws Will throw an error if retrieving the categories fails.
   */
  async getCategories(req) {
    try {
      const { offset, limit } = this.getPagination(req);
      const { vendor } = this.getActiveWarehouseAndVendor(req);

      const queryParams = {
        where: {
          vendorId: vendor.id,
        },
        offset,
        limit,
      };
      const resp = await this.get(queryParams);
      return resp;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves a category by its ID.
   *
   * @param {{ id: string|number }} params - The parameters containing the category ID.
   * @returns {Promise<Object|null>} The category if found, otherwise null.
   *
   * @throws Will throw an error if retrieving the category fails.
   */
  async getById({ params }) {
    try {
      const resp = await this.category.findOne({
        where: {
          id: params.id,
        },
        include: this.db.product,
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }

  async deleteById(req) {
    const t = await this.sequelize.transaction();
    try {
      const { vendor } = this.getActiveWarehouseAndVendor(req);
      const { id } = req.params;
      const resp = await this.delete({ where: { id: id, vendorId: vendor.id } }, { transaction: t });
      await t.commit();
      return resp;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};
