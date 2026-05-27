const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Parser } = require('json2csv');

const router = express.Router();
const prisma = new PrismaClient();

async function logActivity(userId, username, action, detail) {
  try {
    await prisma.activityLog.create({ data: { userId, username, action, detail } });
  } catch {}
}

// GET /api/scans — list with filters + pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const { trackingNumber, status, startDate, endDate, page = 1, limit = 20, sort = 'desc' } = req.query;

    const where = {};
    if (trackingNumber) where.trackingNumber = { contains: trackingNumber };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.scanTime = {};
      if (startDate) where.scanTime.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.scanTime.lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const [records, total] = await Promise.all([
      prisma.scanRecord.findMany({
        where,
        orderBy: { scanTime: sort === 'asc' ? 'asc' : 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { user: { select: { username: true, role: true } } },
      }),
      prisma.scanRecord.count({ where }),
    ]);

    res.json({ records, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scans/export — CSV export
router.get('/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const { trackingNumber, status, startDate, endDate } = req.query;

    const where = {};
    if (trackingNumber) where.trackingNumber = { contains: trackingNumber };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.scanTime = {};
      if (startDate) where.scanTime.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.scanTime.lte = end;
      }
    }
    const records = await prisma.scanRecord.findMany({
      where,
      orderBy: { scanTime: 'desc' },
      include: { user: { select: { username: true } } },
    });

    const flat = records.map(r => ({
      id: r.id,
      scanTime: r.scanTime.toISOString(),
      trackingNumber: r.trackingNumber,
      status: r.status,
      scannedBy: r.scannedBy,
    }));

    const parser = new Parser({ fields: ['id', 'scanTime', 'trackingNumber', 'status', 'scannedBy'] });
    const csv = parser.parse(flat);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scan_records.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scans/stats — dashboard stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const where = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, byStatus] = await Promise.all([
      prisma.scanRecord.count({ where }),
      prisma.scanRecord.count({ where: { ...where, scanTime: { gte: today } } }),
      prisma.scanRecord.groupBy({ by: ['status'], where, _count: { _all: true } }),
    ]);

    res.json({ total, today: todayCount, byStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scans — create
router.post('/', authenticate, async (req, res) => {
  try {
    const { trackingNumber, status, scanTime } = req.body;
    if (!trackingNumber?.trim()) return res.status(400).json({ error: 'trackingNumber is required' });
    if (!status) return res.status(400).json({ error: 'status is required' });

    const data = {
      trackingNumber: trackingNumber.trim(),
      status,
      scannedBy: req.user.email,
      userId: req.user.id,
    };
    if (req.user.role === 'ADMIN' && scanTime) {
      data.scanTime = new Date(scanTime);
    }

    const record = await prisma.scanRecord.create({ data });
    await logActivity(req.user.id, req.user.email, 'CREATE_SCAN', `Created scan #${record.id} for ${record.trackingNumber}`);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/scans/:id — update (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { trackingNumber, status, scanTime } = req.body;

    const existing = await prisma.scanRecord.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    const record = await prisma.scanRecord.update({
      where: { id },
      data: {
        ...(trackingNumber && { trackingNumber: trackingNumber.trim() }),
        ...(status && { status }),
        ...(scanTime && { scanTime: new Date(scanTime) }),
      },
    });
    await logActivity(req.user.id, req.user.email, 'EDIT_SCAN', `Edited scan #${id}`);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scans/:id — delete (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.scanRecord.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    await prisma.scanRecord.delete({ where: { id } });
    await logActivity(req.user.id, req.user.email, 'DELETE_SCAN', `Deleted scan #${id} (${existing.trackingNumber})`);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
