const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../lib/email');

const router = express.Router();
const prisma = new PrismaClient();

const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = pw => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(pw);

async function generateUsername(firstName, lastName) {
  const base = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
  let username = base;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${base}${counter++}`;
  }
  return username;
}

const USER_SELECT = {
  id: true, firstName: true, lastName: true, username: true,
  email: true, role: true, mustChangePassword: true, createdAt: true,
};

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, role, firstName, lastName, sendEmail } = req.body;

    if (!firstName?.trim()) return res.status(400).json({ error: 'First name is required' });
    if (!lastName?.trim()) return res.status(400).json({ error: 'Last name is required' });
    if (!email?.trim() || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const userRole = ['ADMIN', 'OPERATOR', 'READONLY'].includes(role) ? role : 'OPERATOR';
    const username = await generateUsername(firstName.trim(), lastName.trim());
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username,
        email: email.trim().toLowerCase(),
        password: hash,
        role: userRole,
        mustChangePassword: true,
      },
      select: USER_SELECT,
    });

    res.status(201).json({ ...user, tempPassword });

    if (sendEmail) sendWelcomeEmail({ email: user.email, username: user.username, tempPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email, role, password, firstName, lastName } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const data = {};
    if (firstName?.trim()) data.firstName = firstName.trim();
    if (lastName?.trim()) data.lastName = lastName.trim();
    if (email?.trim() && isValidEmail(email)) data.email = email.trim().toLowerCase();
    if (role && ['ADMIN', 'OPERATOR', 'READONLY'].includes(role)) data.role = role;
    if (password) {
      if (!isValidPassword(password)) return res.status(400).json({ error: 'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character' });
      data.password = await bcrypt.hash(password, 10);
      data.mustChangePassword = true;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
