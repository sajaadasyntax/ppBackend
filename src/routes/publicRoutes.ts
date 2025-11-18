import express, { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import * as userController from '../controllers/userController';

const router: Router = express.Router();

// Public hierarchy endpoint for unauthenticated signup flows
router.get('/hierarchy', async (_req: Request, res: Response) => {
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

// Public member signup (unauthenticated). Creates a USER account, disabled until admin activation
router.post('/signup-member', userController.createMember);

export default router;

