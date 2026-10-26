module.exports = function resolveOwnerRole(owner) {
  if (owner?.role === "admin") return "admin";
  if (owner?.role === "seller" || owner?.role === "owner") return "seller";
  return null;
};
