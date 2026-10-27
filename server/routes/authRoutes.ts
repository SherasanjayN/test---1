import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, User } from '../db';
import { generateToken, validateRegistration, sanitizeUser, authenticate, AuthRequest } from '../auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, area, district, password } = req.body;

    const validation = validateRegistration({ name, phone, email, area, district, password });
    if (!validation.valid) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = db.findUserByEmail(trimmedEmail);
    if (existing) {
      res.status(400).json({ error: 'A user with this email address already exists.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      phone: phone.trim(),
      email: trimmedEmail,
      area: area.trim(),
      district: district.trim(),
      password_hash,
      status: 'PENDING',
      role: 'USER',
      group_id: null,
      created_at: new Date().toISOString(),
    };

    db.addUser(newUser);

    res.status(201).json({
      message: 'Registration successful! Your application is pending Super Admin approval.',
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to complete registration: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = db.findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (user.status === 'REMOVED') {
      res.status(403).json({ error: 'This account has been removed and cannot access the application.' });
      return;
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Generate JWT token for all statuses (PENDING users will land on pending screen)
    const token = generateToken(user);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const sanitized = sanitizeUser(user);
    let group = null;
    if (user.group_id) {
      group = db.findGroupById(user.group_id);
    }

    res.json({
      token,
      user: sanitized,
      group,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const sanitized = sanitizeUser(req.user);
  let group = null;
  if (req.user.group_id) {
    group = db.findGroupById(req.user.group_id);
  }

  res.json({
    user: sanitized,
    group,
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
