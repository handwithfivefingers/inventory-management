'use strict'

/**
 * Seed a single owner user. Vendors belong to users (vendor.userId -> users.id),
 * so we create an owner first; the vendors seeder links to this user's id.
 *
 * Note: bulkInsert does NOT run model hooks, so the password is hashed here
 * manually with bcryptjs to match the user model's `set` hook.
 *
 * Login: seed-owner@example.com / password123
 */

const bcrypt = require('bcryptjs')

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date()
    await queryInterface.bulkInsert('users', [
      {
        nickname: 'SEED Owner',
        firstName: 'Seed',
        lastName: 'Owner',
        email: 'seed-owner@example.com',
        password: bcrypt.hashSync('password123', 10),
        subscription: 'free',
        createdAt: now,
        updatedAt: now
      }
    ])
  },

  async down(queryInterface) {
    // Vendors reference users with ON DELETE SET NULL, so deleting the user is safe.
    await queryInterface.bulkDelete(
      'users',
      { email: 'seed-owner@example.com' },
      {}
    )
  }
}
