import { Router } from 'express';
import { db, Message } from '../db';
import { authenticate, AuthRequest } from '../auth';

const router = Router();

// GET /api/groups/:id/messages
router.get('/:id/messages', authenticate, (req: AuthRequest, res) => {
  const groupId = req.params.id;
  const user = req.user!;

  // Must be super admin OR member of this group
  if (user.role !== 'SUPER_ADMIN' && user.group_id !== groupId) {
    res.status(403).json({ error: 'Access denied. You can only view chat for your own group.' });
    return;
  }

  const group = db.findGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found.' });
    return;
  }

  if (user.status !== 'APPROVED') {
    res.status(403).json({ error: 'Your account must be approved before using group chat.' });
    return;
  }

  const messages = db.getMessages(groupId).map(message => {
    const publicMessage = { ...message };
    delete publicMessage.deleted_text;
    delete publicMessage.edit_history;
    return publicMessage;
  });
  res.json({
    group: {
      id: group.id,
      name: group.group_name,
      area: group.area,
      district: group.district,
    },
    messages,
  });
});

// POST /api/groups/:id/messages
router.post('/:id/messages', authenticate, (req: AuthRequest, res) => {
  const groupId = req.params.id;
  const user = req.user!;

  if (user.role !== 'SUPER_ADMIN' && user.group_id !== groupId) {
    res.status(403).json({ error: 'Access denied. You can only send messages in your allocated group.' });
    return;
  }

  const group = db.findGroupById(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found.' });
    return;
  }

  if (user.status !== 'APPROVED') {
    res.status(403).json({ error: 'Your account must be approved before using group chat.' });
    return;
  }

  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) {
    res.status(400).json({ error: 'Message text must contain 1 to 2,000 characters.' });
    return;
  }

  const newMessage: Message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    group_id: groupId,
    sender_id: user.id,
    sender_name: user.name,
    sender_role: user.role,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  db.addMessage(newMessage);

  res.status(201).json(newMessage);
});

router.patch('/:id/messages/:messageId', authenticate, (req: AuthRequest, res) => {
  const user = req.user!;
  const groupId = req.params.id;
  if (user.status !== 'APPROVED') {
    res.status(403).json({ error: 'Your account must be approved before using group chat.' });
    return;
  }
  if (user.role !== 'SUPER_ADMIN' && user.group_id !== groupId) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const message = db.findMessageById(req.params.messageId);
  if (!message || message.group_id !== groupId) {
    res.status(404).json({ error: 'Message not found.' });
    return;
  }
  const canModerate = user.role === 'SUPER_ADMIN' || user.role === 'GROUP_ADMIN';
  if (message.sender_id !== user.id && !canModerate) {
    res.status(403).json({ error: 'You can only edit your own messages.' });
    return;
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 2000) {
    res.status(400).json({ error: 'Message text must contain 1 to 2,000 characters.' });
    return;
  }
  const updated = db.updateMessage(message.id, text, user.id);
  if (!updated) {
    res.status(409).json({ error: 'This message can no longer be edited.' });
    return;
  }
  const publicMessage = { ...updated };
  delete publicMessage.deleted_text;
  delete publicMessage.edit_history;
  res.json(publicMessage);
});

router.delete('/:id/messages/:messageId', authenticate, (req: AuthRequest, res) => {
  const user = req.user!;
  const groupId = req.params.id;
  if (user.status !== 'APPROVED') {
    res.status(403).json({ error: 'Your account must be approved before moderating group chat.' });
    return;
  }
  if (user.role !== 'SUPER_ADMIN' && user.group_id !== groupId) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  const message = db.findMessageById(req.params.messageId);
  if (!message || message.group_id !== groupId) {
    res.status(404).json({ error: 'Message not found.' });
    return;
  }
  const canModerate = user.role === 'SUPER_ADMIN' || user.role === 'GROUP_ADMIN';
  if (message.sender_id !== user.id && !canModerate) {
    res.status(403).json({ error: 'You can only delete your own messages.' });
    return;
  }

  const deleted = db.softDeleteMessage(message.id, user.id);
  if (!deleted) {
    res.status(409).json({ error: 'This message has already been deleted.' });
    return;
  }
  const publicMessage = { ...deleted };
  delete publicMessage.deleted_text;
  delete publicMessage.edit_history;
  res.json(publicMessage);
});

export default router;
