module.exports = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        errorCode: 'ACCESS_DENIED',
        message: 'You are not allowed to access this resource'
      });
    }
    next();
  };
};