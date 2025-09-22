'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([
        queryInterface.changeColumn(
          'products',
          'costPrice',
          {
            type: Sequelize.INTEGER,
            allowNull: true
          },
          { transaction: t }
        )
      ])
    })
  },

  async down(queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.changeColumn(
        'products',
        'costPrice',
        {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        { transaction: t }
      )
    ])
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
}
