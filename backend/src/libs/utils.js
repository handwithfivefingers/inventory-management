const retrieveUser = (req) => {
  const user = req.locals.user;
  if (!user) {
    throw new Error("User Not Found");
  }
  return user;
};
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
