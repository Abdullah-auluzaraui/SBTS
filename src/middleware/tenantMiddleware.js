// BE-S1-8: Tenant Middleware (NEW for v2.0)
// Automatically attaches req.schoolId to every request for scoped roles.
// - superadmin: no school scoping (can see all schools)
// - schooladmin / driver / parent: scoped to their own school only

module.exports = (req, res, next) => {
  const unscopedRoles = ['superadmin'];

  if (unscopedRoles.includes(req.user.role)) {
    // Super Admin has no tenant restriction — pass through
    return next();
  }

  if (!req.user.school) {
    // Non-superadmin without a school ref is a data integrity error
    return res.status(403).json({
      success: false,
      errorCode: 'NO_SCHOOL_ASSIGNED',
      message: 'Your account is not linked to any school. Contact the system administrator.'
    });
  }

  // Attach schoolId so all controllers can use req.schoolId for filtering
  req.schoolId = req.user.school;
  next();
};
