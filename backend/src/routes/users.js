const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users — list all users (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — create user (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const validRoles = ['ADMIN', 'OPERATOR'];
    const userRole = validRoles.includes(role) ? role : 'OPERATOR';

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username: username.trim(), password: hash, role: userRole },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id — update user (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { username, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const data = {};
    if (username?.trim()) data.username = username.trim();
    if (role && ['ADMIN', 'OPERATOR'].includes(role)) data.role = role;
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — delete user (admin only, cannot delete self)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    await prisma.scanRecord.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
