import { Router } from 'express';
import { authenticate, AuthRequest } from '../auth';
import { db } from '../db';

const router = Router();

router.get('/', authenticate, (req: AuthRequest, res) => {
  const notifications = db.getNotifications(req.user!.id);
  res.json({
    notifications,
    unread_count: notifications.filter(notification => !notification.read_at).length,
  });
});

router.patch('/:id/read', authenticate, (req: AuthRequest, res) => {
  const notification = db.markNotificationRead(req.params.id, req.user!.id);
  if (!notification) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  res.json(notification);
});

export default router;
