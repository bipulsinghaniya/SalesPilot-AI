import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  appName: process.env.APP_NAME || 'SalesPilot AI',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/salespilot_ai',
  vectorIndexName: process.env.MONGODB_VECTOR_INDEX_NAME || 'knowledge_chunks_vector_index',

  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret-change-in-production',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  encryptionKey: process.env.ENCRYPTION_KEY || '',

  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',

  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiChatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenlabsDefaultVoiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',

  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',

  exotelApiKey: process.env.EXOTEL_API_KEY || '',
  exotelApiToken: process.env.EXOTEL_API_TOKEN || '',
  exotelSubdomain: process.env.EXOTEL_SUBDOMAIN || '',
  exotelCallerId: process.env.EXOTEL_CALLER_ID || '',

  googleCalendarClientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
  googleCalendarClientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
  googleCalendarRedirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:5000/api/integrations/google-calendar/callback',

  smtpHost: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'SalesPilot AI <no-reply@salespilot.ai>',

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};
