const BaseCRUDService = require("@constant/base");

module.exports = class SettingService extends BaseCRUDService {
  constructor() {
    super("setting");
  }



  /**
   * Creates a setting with the provided payment information.
   *
   * @param {Object} payment - Payment information to create.
   * @returns {Promise<boolean>} True if created.
   * @throws If there is an error while creating the setting.
   */
  async create({ payment }) {
    const t = await this.sequelize.transaction();
    try {
      await this.createInstance(
        { payment },
        {
          transaction: t,
        }
      );

      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Updates a setting with the provided payment information.
   *
   * @param {Object} options - Options to update setting.
   * @param {string} options.id - The id of the setting to update.
   * @param {Object} options.payment - The payment information to update.
   * @returns {Promise<{id, payment, createdAt, updatedAt}>} The updated setting.
   * @throws If there is an error while updating the setting.
   */
  async updateSetting({ payment, id }) {
    const t = await this.sequelize.transaction();
    try {
      const resp = await this.updateInstance(
        {
          where: {
            id,
          },
        },
        { payment },
        {
          transaction: t,
        }
      );

      await t.commit();
      return resp.dataValues;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Retrieve the setting of a vendor.
   *
   * @param {string} vendorId The id of the vendor.
   * @returns {Promise<{id, payment, createdAt, updatedAt}>} The setting of the vendor.
   * @throws If there is an error while retrieving the setting of the vendor.
   */
  async getSetting(vendorId) {
    try {
      const resp = await this.findOne({
        where: {
          vendorId,
        },
      });
      return resp;
    } catch (error) {
      throw error;
    }
  }
};
