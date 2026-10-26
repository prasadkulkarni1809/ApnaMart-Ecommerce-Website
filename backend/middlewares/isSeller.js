module.exports = function isSeller(req, res, next) {
  if (
    req.role !== "seller" ||
    !req.owner ||
    !req.seller ||
    String(req.seller._id) !== String(req.owner._id)
  ) {
    return res.status(403).json({
      success: false,
      message: "Seller access required",
    });
  }

  next();
};
