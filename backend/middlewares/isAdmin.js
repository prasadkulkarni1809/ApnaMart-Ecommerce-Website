module.exports = function isAdmin(req, res, next) {
  if (req.role !== "admin" || req.owner?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Platform admin access required",
    });
  }

  next();
};
