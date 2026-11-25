import { Router } from 'express';
import { Integration } from '../../models/index.js';
import { requireAuth, requireOrg, requireRole } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { encryptSecret, maskSecret } from '../../utils/crypto.js';
import { getGoogleCalendarAuthUrl } from '../../services/calendar/googleCalendarService.js';
import { env } from '../../config/env.js';

const router = Router();

const SUPPORTED_PROVIDERS = [
  { provider: 'openai', label: 'OpenAI (LLM & Embeddings)', envConfigured: () => Boolean(env.openaiApiKey) },
  { provider: 'deepgram', label: 'Deepgram (Speech-to-Text)', envConfigured: () => Boolean(env.deepgramApiKey) },
  { provider: 'elevenlabs', label: 'ElevenLabs (Text-to-Speech)', envConfigured: () => Boolean(env.elevenlabsApiKey) },
  { provider: 'twilio', label: 'Twilio (Telephony)', envConfigured: () => Boolean(env.twilioAccountSid && env.twilioAuthToken) },
  { provider: 'exotel', label: 'Exotel (Telephony)', envConfigured: () => Boolean(env.exotelApiKey && env.exotelApiToken) },
  { provider: 'google_calendar', label: 'Google Calendar', envConfigured: () => Boolean(env.googleCalendarClientId) },
  { provider: 'email', label: 'Email (Nodemailer / Brevo)', envConfigured: () => Boolean(env.smtpUser && env.smtpPass) },
  { provider: 'cloudinary', label: 'Cloudinary (Media Storage)', envConfigured: () => Boolean(env.cloudinaryCloudName) },
];

router.get('/', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const orgIntegrations = await Integration.find({ organizationId: req.organization._id }).lean();
  const byProvider = new Map(orgIntegrations.map((i) => [i.provider, i]));

  const list = SUPPORTED_PROVIDERS.map((p) => {
    const saved = byProvider.get(p.provider);
    const connected = saved?.status === 'connected' || p.envConfigured();
    return {
      provider: p.provider,
      label: p.label,
      status: saved?.status || (p.envConfigured() ? 'connected' : 'disconnected'),
      maskedPreview: saved?.maskedPreview || (p.envConfigured() ? 'Configured via environment' : ''),
      config: saved?.config || {},
      lastVerifiedAt: saved?.lastVerifiedAt || null,
      connected,
    };
  });

  res.json({ success: true, data: list });
}));

router.put(
  '/:provider',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin'),
  asyncHandler(async (req, res) => {
    const { apiKey, config = {} } = req.body;
    const provider = req.params.provider;

    const update = {
      status: 'connected',
      config,
      lastVerifiedAt: new Date(),
      updatedBy: req.user._id,
    };
    if (apiKey) {
      update.encryptedCredentials = encryptSecret(apiKey);
      update.maskedPreview = maskSecret(apiKey);
    }

    const integration = await Integration.findOneAndUpdate(
      { organizationId: req.organization._id, provider },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: {
        provider: integration.provider,
        status: integration.status,
        maskedPreview: integration.maskedPreview,
        config: integration.config,
      },
    });
  })
);

router.get('/google-calendar/auth-url', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const url = getGoogleCalendarAuthUrl(req.organization._id);
  res.json({ success: true, data: { url } });
}));

export default router;
