import { Router } from 'express';
import { db, AdminMessage } from '../db';
import { authenticate, AuthRequest, requireRole } from '../auth';

const router = Router();

router.get('/', authenticate, requireRole('USER', 'GROUP_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res) => {
  res.json(db.getAdminMessages(req.user!.id).map(({ recipient_user_ids: _recipients, ...message }) => message));
});

router.post('/', authenticate, (req: AuthRequest, res) => {
  const actor = req.user!;
  if (!['GROUP_ADMIN', 'SUPER_ADMIN'].includes(actor.role) || actor.status !== 'APPROVED') {
    res.status(403).json({ error: 'Only approved administrators can send admin messages.' });
    return;
  }
  const { title, message, audience, group_id, user_ids } = req.body;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120 ||
    typeof message !== 'string' || !message.trim() || message.trim().length > 4000) {
    res.status(400).json({ error: 'A title (up to 120 characters) and message (up to 4,000 characters) are required.' });
    return;
  }

  let recipients = db.getUsers().filter(user => user.status === 'APPROVED');
  let messageGroupId: string | undefined;
  if (actor.role === 'GROUP_ADMIN') {
    if (!actor.group_id || (group_id && group_id !== actor.group_id)) {
      res.status(403).json({ error: 'You may only message members of your own group.' });
      return;
    }
    recipients = recipients.filter(user => user.group_id === actor.group_id);
    messageGroupId = actor.group_id;
  } else if (audience === 'GROUP') {
    if (typeof group_id !== 'string' || !db.findGroupById(group_id)) {
      res.status(400).json({ error: 'Choose a valid group.' });
      return;
    }
    recipients = recipients.filter(user => user.group_id === group_id);
    messageGroupId = group_id;
  } else if (audience === 'SELECTED') {
    if (!Array.isArray(user_ids) || user_ids.length === 0 || user_ids.length > 500 ||
      user_ids.some((id: unknown) => typeof id !== 'string')) {
      res.status(400).json({ error: 'Select at least one valid recipient.' });
      return;
    }
    const selected = new Set(user_ids as string[]);
    recipients = recipients.filter(user => selected.has(user.id));
    if (recipients.length !== selected.size) {
      res.status(400).json({ error: 'One or more selected users are not active approved members.' });
      return;
    }
  } else if (actor.role === 'SUPER_ADMIN' && audience !== 'ALL') {
    res.status(400).json({ error: 'Choose all users, a group, or selected users.' });
    return;
  }

  if (!recipients.length) {
    res.status(400).json({ error: 'There are no approved recipients for this message.' });
    return;
  }
  const record: AdminMessage = {
    id: `admin_message_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim(),
    message: message.trim(),
    author_id: actor.id,
    author_name: actor.name,
    author_role: actor.role,
    group_id: messageGroupId,
    recipient_user_ids: recipients.map(user => user.id),
    created_at: new Date().toISOString(),
  };
  const saved = db.createAdminMessage(record);
  const { recipient_user_ids: _recipients, ...response } = saved;
  res.status(201).json(response);
});

export default router;
