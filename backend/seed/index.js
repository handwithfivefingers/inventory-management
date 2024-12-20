const fs = require("fs");
const path = require("path");
const { randomCompanies, randomAddresses, randomName } = require("../utils/random");
const currentPath = path.resolve();

const generateUsers = () => {
  const users = [];
  for (let i = 0; i < 100; i++) {
    const name = randomName();
    const user = {
      firstName: name.split(" ")[0] || "John",
      lastName: name.split(" ")[1] || "Doe",
      vendor: randomCompanies(),
      warehouse: randomAddresses(),
      email: `hdme${i}@gmail.com`,
      password: "123456",
    };
    users.push(user);
  }

  const jsonData = JSON.stringify(users, null, 2);
  fs.writeFile(`${currentPath}/seed/users.seed.json`, jsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("Data written to file");
    }
  });
};
generateUsers();
