import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole, AuthRequest, sanitizeUser } from '../auth';

const router = Router();

// GET /api/users/pending - Super Admin only
router.get('/pending', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const users = db.getUsers().filter(u => u.status === 'PENDING');
  res.json(users.map(sanitizeUser));
});

// GET /api/users - Super Admin: all users; Group Admin: their group users
router.get('/', authenticate, (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const allUsers = db.getUsers();
  const groups = db.getGroups();

  if (req.user.role === 'SUPER_ADMIN') {
    const enriched = allUsers.map(user => {
      const userGroup = user.group_id ? groups.find(g => g.id === user.group_id) : null;
      return {
        ...sanitizeUser(user),
        group_name: userGroup ? userGroup.group_name : null,
      };
    });
    res.json(enriched);
    return;
  }

  if (req.user.role === 'GROUP_ADMIN') {
    if (!req.user.group_id) {
      res.json([]);
      return;
    }
    const groupUsers = allUsers.filter(u => u.group_id === req.user!.group_id && u.status === 'APPROVED');
    const userGroup = groups.find(g => g.id === req.user!.group_id);
    const enriched = groupUsers.map(user => ({
      ...sanitizeUser(user),
      group_name: userGroup ? userGroup.group_name : null,
    }));
    res.json(enriched);
    return;
  }

  // Regular user can view their group members
  if (req.user.group_id) {
    const groupUsers = allUsers.filter(u => u.group_id === req.user!.group_id && u.status === 'APPROVED');
    res.json(groupUsers.map(sanitizeUser));
    return;
  }

  res.json([sanitizeUser(req.user)]);
});

// POST /api/users/:id/approve - Super Admin only
// Approves registration, allocates to group, optionally designates as Group Admin
router.post('/:id/approve', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { group_id, is_group_admin } = req.body;

  // Validate group if provided
  let group = null;
  if (group_id) {
    group = db.findGroupById(group_id);
    if (!group) {
      res.status(400).json({ error: 'Selected group does not exist.' });
      return;
    }
  }

  const role = is_group_admin ? 'GROUP_ADMIN' : 'USER';

  // If designated as group admin, update group's admin id and demote previous admin
  if (is_group_admin && group_id) {
    if (group && group.group_admin_id && group.group_admin_id !== user.id) {
      const prevAdmin = db.findUserById(group.group_admin_id);
      if (prevAdmin && prevAdmin.role === 'GROUP_ADMIN') {
        db.updateUser(prevAdmin.id, { role: 'USER' });
      }
    }
    db.updateGroup(group_id, { group_admin_id: user.id });
  }

  const updated = db.updateUser(user.id, {
    status: 'APPROVED',
    role,
    group_id: group_id || user.group_id || null,
  });

  res.json({
    message: `User ${user.name} approved successfully.`,
    user: updated ? sanitizeUser(updated) : null,
  });
});

// POST /api/users/:id/reject - Super Admin only
router.post('/:id/reject', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = db.updateUser(user.id, {
    status: 'REJECTED',
  });

  res.json({
    message: `User ${user.name} registration was rejected.`,
    user: updated ? sanitizeUser(updated) : null,
  });
});

// POST /api/users/:id/remove - Super Admin only; preserves financial records.
router.post('/:id/remove', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const user = db.findUserById(req.params.id);
  if (!user || user.status === 'REMOVED') {
    res.status(404).json({ error: 'Active user not found.' });
    return;
  }
  if (user.role === 'SUPER_ADMIN') {
    res.status(400).json({ error: 'A Super Admin account cannot be removed here.' });
    return;
  }
  const updated = db.removeUserFromActiveAccess(user.id, req.user!);
  if (!updated) {
    res.status(409).json({ error: 'User access could not be removed.' });
    return;
  }
  res.json({ message: `${user.name} was removed from active access. Their financial history is retained.`, user: sanitizeUser(updated) });
});

// POST /api/users/:id/allocate-group - Super Admin only
router.post('/:id/allocate-group', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { group_id } = req.body;
  if (!group_id) {
    res.status(400).json({ error: 'Group ID is required.' });
    return;
  }

  const group = db.findGroupById(group_id);
  if (!group) {
    res.status(404).json({ error: 'Group not found.' });
    return;
  }

  const updated = db.updateUser(user.id, {
    group_id: group.id,
  });

  res.json({
    message: `Allocated ${user.name} to group ${group.group_name}`,
    user: updated ? sanitizeUser(updated) : null,
  });
});

// POST /api/users/:id/assign-role - Super Admin only
router.post('/:id/assign-role', authenticate, requireRole('SUPER_ADMIN'), (req: AuthRequest, res) => {
  const user = db.findUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { role } = req.body;
  if (!['USER', 'GROUP_ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Invalid role specified.' });
    return;
  }

  if (role === 'GROUP_ADMIN') {
    if (!user.group_id) {
      res.status(400).json({ error: 'Cannot make user a Group Admin without assigning them to a group first.' });
      return;
    }
    const group = db.findGroupById(user.group_id);
    if (group && group.group_admin_id && group.group_admin_id !== user.id) {
      // Demote previous admin to regular member
      const oldAdmin = db.findUserById(group.group_admin_id);
      if (oldAdmin) {
        db.updateUser(oldAdmin.id, { role: 'USER' });
      }
    }
    if (group) {
      db.updateGroup(group.id, { group_admin_id: user.id });
    }
  } else if (role === 'USER') {
    // If user was group admin, remove group admin status from group
    if (user.group_id) {
      const group = db.findGroupById(user.group_id);
      if (group && group.group_admin_id === user.id) {
        db.updateGroup(group.id, { group_admin_id: null });
      }
    }
  }

  const updated = db.updateUser(user.id, { role });

  res.json({
    message: `Updated role for ${user.name} to ${role}`,
    user: updated ? sanitizeUser(updated) : null,
  });
});

export default router;
