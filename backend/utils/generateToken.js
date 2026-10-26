const jwt = require("jsonwebtoken");
const resolveOwnerRole = require("./resolveOwnerRole");

module.exports = function generateToken(user) {
  return jwt.sign(
    {
      _id: user._id,
      role: resolveOwnerRole(user) || "customer",
    },
    process.env.JWT_SECRET
  );
};  
