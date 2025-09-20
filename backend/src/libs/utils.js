/**
 * Retrieves the user from the request.
 *
 * @param {Request} req - The express request object.
 *
 * @returns {{ id, firstName, lastName, email, subscription, secret, roles: [ { id, name, user_role: { roleId, userId } }], permissions: [ { id, name, description } ] } ], vendors:[], warehouses:[], vendor } } The user object.
 *
 * @throws {Error} If no user is found.
 */

const retrieveUser = (req) => {
  if (!req) throw new Error("Invalid Request");
  const user = req.locals.user;
  if (!user) {
    throw new Error("User Not Found");
  }
  return user;
};

/**
 * Get the first vendor of the user.
 * If the user has a vendor, return it. Otherwise, return the first vendor in the user's vendors list.
 *
 * @param {Request} req The express request object.
 * @returns { { id, name } } The first vendor of the user.
 */
const retrieveFirstVendor = (req) => {
  const user = retrieveUser(req);
  if (user.vendor) return user.vendor;
  if (user.vendors[0]) return user.vendors[0];
  return false;
};

module.exports = {
  retrieveUser,
  retrieveFirstVendor,
};
