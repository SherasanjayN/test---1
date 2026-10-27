import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db, User } from './db';

const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' &&
  (!configuredSecret || configuredSecret.length < 32 || configuredSecret.startsWith('replace-with-'))) {
  throw new Error('Production requires a JWT_SECRET containing at least 32 characters.');
}
const JWT_SECRET = configuredSecret || randomBytes(32).toString('hex');
if (!configuredSecret) {
  console.warn('JWT_SECRET is not configured; sessions will expire when this process restarts.');
}

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      groupId: user.group_id,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.findUserById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User not found or account deactivated.' });
      return;
    }
    if (user.status === 'REJECTED' || user.status === 'REMOVED') {
      res.status(403).json({ error: 'This account cannot access the application.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

export function requireRole(...roles: Array<'USER' | 'GROUP_ADMIN' | 'SUPER_ADMIN'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied. You do not have permission for this action.' });
      return;
    }

    if (req.user.status !== 'APPROVED') {
      res.status(403).json({ error: 'Your account must be approved before using this feature.' });
      return;
    }

    next();
  };
}

export function validateRegistration(data: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Names support Tamil and other Unicode letters, but never digits.
  const name: string = typeof data.name === 'string' ? data.name.trim() : '';
  const nameLetterCount = Array.from(name).filter(character => /\p{L}/u.test(character)).length;
  if (nameLetterCount < 3 || !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(name)) {
    errors.name = 'Name must contain at least 3 letters and no digits.';
  }

  // Phone exactly 10 digits
  const phoneClean = (data.phone || '').toString().trim();
  if (!/^[6-9]\d{9}$/.test(phoneClean)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }

  // Email regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  // Area & District mandatory
  if (!data.area || typeof data.area !== 'string' || !data.area.trim()) {
    errors.area = 'Area is required.';
  }

  if (!data.district || typeof data.district !== 'string' || !data.district.trim()) {
    errors.district = 'District is required.';
  }

  // Password ≥ 6 characters alphanumeric
  const password = data.password || '';
  if (
    typeof password !== 'string' ||
    password.length < 6 ||
    !/[a-zA-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    errors.password = 'Password must be at least 6 characters and contain both letters and numbers.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeUser(user: User): Omit<User, 'password_hash'> {
  const { password_hash, ...rest } = user;
  return rest;
}

export { bcrypt };
