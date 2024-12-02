const db = require("@db");
module.exports = class AuthenticateService {
  constructor() {
    this.user = db["user"];
  }
  async login() {}
  async register(params) {
    try {
      console.log("this.user", params);
      const newUser = await this.user.build(params);
      console.log("newUser", newUser.email);
      await newUser.save();
      return newUser;
    } catch (error) {
      throw error;
    }
  }
};
