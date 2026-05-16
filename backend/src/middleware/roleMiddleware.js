// BE-S1-7: roleMiddleware (Updated for v2.0)
// Now accepts an array of roles instead of a single string.
// Usage: roleMiddleware(['superadmin', 'schooladmin'])
module.exports = (rolesArray) => {
  return (req, res, next) => {
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCESS_DENIED',
        message: 'You are not allowed to access this resource'
      });
    }
    next();
  };
};