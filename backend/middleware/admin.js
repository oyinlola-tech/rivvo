const admin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  return next();
};

export default admin;
