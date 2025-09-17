const express = require('express');
const prisma = require('../utils/prisma');
const userController = require('../controllers/userController');

const router = express.Router();

// Public hierarchy endpoint for unauthenticated signup flows
router.get('/hierarchy', async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        localities: {
          where: { active: true },
          orderBy: { name: 'asc' },
          include: {
            adminUnits: {
              where: { active: true },
              orderBy: { name: 'asc' },
              include: {
                districts: {
                  where: { active: true },
                  orderBy: { name: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    res.json({ data: regions });
  } catch (error) {
    console.error('Public hierarchy error:', error);
    res.status(500).json({ error: 'Failed to fetch public hierarchy' });
  }
});

module.exports = router;

// Public member signup (unauthenticated). Creates a USER account, disabled until admin activation
router.post('/signup-member', userController.createMember);


