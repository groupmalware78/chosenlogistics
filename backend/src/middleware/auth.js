const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'chosen-logistics-tracker-secret';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireNotReadonly = (req, res, next) => {
  if (req.user?.role === 'READONLY') {
    return res.status(403).json({ error: 'Read-only access: action not permitted' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireNotReadonly, JWT_SECRET };
