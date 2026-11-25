import { Router } from 'express';
import { User, Notification } from '../../models/index.js';
import { requireAuth, requireOrg } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
  const allowed = {};
  if (req.body.name) allowed.name = req.body.name;
  if (req.body.phone !== undefined) allowed.phone = req.body.phone;
  if (req.body.notificationPreferences) allowed.notificationPreferences = req.body.notificationPreferences;

  const user = await User.findByIdAndUpdate(req.user._id, { $set: allowed }, { new: true }).lean();
  res.json({ success: true, data: user });
}));

router.get('/notifications', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ organizationId: req.organization._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  res.json({ success: true, data: notifications });
}));

router.patch('/notifications/:id/read', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organization._id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  res.json({ success: true, data: notification });
}));

export default router;
