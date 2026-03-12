const moderator = (req, res, next) => {
  if (!req.user?.isModerator && !req.user?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden', message: 'Moderator access required' });
  }
  return next();
};

export default moderator;
