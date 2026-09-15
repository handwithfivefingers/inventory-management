'use strict'

/**
 * Adds `settings.appearance` (JSON text) for niche theming: preset key,
 * primary/accent colors, logo URL and terminology overrides applied by the
 * client via CSS variables (see client/app/libs/niche-theme.ts).
 */

/** @type {import('sequelize-cli').Migration} */
const columnExists = async (queryInterface, table, column) => {
  const desc = await queryInterface.describeTable(table)
  return Object.prototype.hasOwnProperty.call(desc, column)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'settings', 'appearance'))) {
      await queryInterface.addColumn('settings', 'appearance', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON: { preset, primaryColor, accentColor, logoUrl, terminology }'
      })
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'settings', 'appearance')) {
      await queryInterface.removeColumn('settings', 'appearance')
    }
  }
}
