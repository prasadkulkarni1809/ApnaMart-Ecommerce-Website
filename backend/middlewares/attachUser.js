const jwt = require("jsonwebtoken");
const userModel = require("../models/user-models");

module.exports = async function attachUser(req, res, next) {


  const token = req.cookies.token;


  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await userModel
      .findOne({ email: decoded.email })
      .select("-password");

    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};
