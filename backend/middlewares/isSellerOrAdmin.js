module.exports = function isSellerOrAdmin(req, res, next) {
  const sellerAccess = req.role === "seller" && req.owner && req.seller &&
    String(req.seller._id) === String(req.owner._id);
  const adminAccess = req.role === "admin" && req.owner?.role === "admin";
  if (!sellerAccess && !adminAccess) {
    return res.status(403).json({
      success: false,
      message: "Seller or platform admin access required",
    });
  }

  next();
};
