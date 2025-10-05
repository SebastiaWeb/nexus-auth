import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { getCurrentUser, getCurrentSession } from '@nexusauth/express-helpers';
import { nexusAuth } from '../config/nexus-auth';
import { AppDataSource } from '../config/database';
import { User } from '../entities';
import { updateProfileSchema } from '../utils/validation';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Get Profile
router.get('/profile', async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch full user data
    const userRepo = AppDataSource.getRepository(User);
    const fullUser = await userRepo.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'name', 'image', 'emailVerified', 'createdAt'],
    });

    res.json({ user: fullUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Profile
router.put('/profile', async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const data = updateProfileSchema.parse(req.body);

    const userRepo = AppDataSource.getRepository(User);
    await userRepo.update({ id: user.id }, data);

    const updatedUser = await userRepo.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'name', 'image', 'emailVerified', 'createdAt'],
    });

    res.json({ user: updatedUser });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validación fallida', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get Sessions
router.get('/sessions', async (req, res) => {
  try {
    const user = getCurrentUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // En JWT no hay sesiones en DB por defecto
    // Este endpoint es más útil con database sessions
    const session = getCurrentSession(req);

    res.json({
      sessions: [
        {
          current: true,
          user: session?.user,
          expiresAt: session?.expires,
        },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Me (simple endpoint)
router.get('/me', (req, res) => {
  const user = getCurrentUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({ user });
});

export default router;
