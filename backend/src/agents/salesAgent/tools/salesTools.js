import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  Lead,
  Appointment,
  Conversation,
  Notification,
} from '../../../models/index.js';
import { searchKnowledge } from '../../../services/rag/ragService.js';
import { calculateDeterministicLeadScore } from '../../../services/crm/leadScoringService.js';
import {
  checkAvailability,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../../../services/calendar/googleCalendarService.js';
import { sendAppointmentConfirmationEmail, sendEmail } from '../../../services/email/emailService.js';

export function createSalesTools({ organizationId, agent, conversation, emitEvent }) {
  const searchKnowledgeBase = tool(
    async ({ query, category }) => {
      const results = await searchKnowledge({
        organizationId,
        query,
        category: category || null,
        limit: 4,
      });
      if (!results.length) {
        return JSON.stringify({ found: false, message: 'No matching knowledge base articles found.' });
      }
      return JSON.stringify({
        found: true,
        excerpts: results.map((r) => ({
          documentTitle: r.documentTitle,
          category: r.category,
          score: Number((r.score || 0).toFixed(3)),
          content: r.content,
        })),
      });
    },
    {
      name: 'searchKnowledgeBase',
      description: 'Search the organization knowledge base for company policies, pricing, FAQs, and sales guides.',
      schema: z.object({
        query: z.string().min(2),
        category: z.enum(['product', 'pricing', 'faq', 'policy', 'sales_guide', 'general']).optional(),
      }),
    }
  );

  const getProductInformation = tool(
    async ({ productQuery }) => {
      const results = await searchKnowledge({
        organizationId,
        query: productQuery,
        category: 'product',
        limit: 4,
      });
      const fallback = results.length
        ? results
        : await searchKnowledge({ organizationId, query: productQuery, limit: 4 });
      return JSON.stringify({
        productDescription: agent.productDescription || '',
        matches: fallback.map((r) => ({ title: r.documentTitle, content: r.content })),
      });
    },
    {
      name: 'getProductInformation',
      description: 'Retrieve verified product specifications, plans, and feature details.',
      schema: z.object({ productQuery: z.string().min(2) }),
    }
  );

  const createLeadTool = tool(
    async ({ name, email, phone, company, jobTitle }) => {
      let lead = null;
      if (email) {
        lead = await Lead.findOne({ organizationId, email: email.toLowerCase(), deletedAt: null });
      }
      if (!lead && phone) {
        lead = await Lead.findOne({ organizationId, phone, deletedAt: null });
      }
      if (!lead) {
        lead = await Lead.create({
          organizationId,
          name,
          email: email?.toLowerCase(),
          phone,
          company: company || '',
          jobTitle: jobTitle || '',
          source: conversation.activeMode === 'voice' ? 'voice_inbound' : 'text_chat',
          pipelineStage: 'contacted',
        });
      }
      await Conversation.findByIdAndUpdate(conversation._id, { leadId: lead._id });
      conversation.leadId = lead._id;
      emitEvent?.('lead:updated', { lead });
      return JSON.stringify({ created: true, leadId: String(lead._id), name: lead.name });
    },
    {
      name: 'createLead',
      description: 'Create or link a CRM lead record once the customer shares their name or contact details.',
      schema: z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
      }),
    }
  );

  const updateLeadTool = tool(
    async ({ pipelineStage, company, jobTitle, budgetAmount, requirements, note }) => {
      if (!conversation.leadId) {
        return JSON.stringify({ updated: false, reason: 'No lead linked yet. Call createLead first.' });
      }
      const update = {};
      if (pipelineStage) update.pipelineStage = pipelineStage;
      if (company) update.company = company;
      if (jobTitle) update.jobTitle = jobTitle;
      if (typeof budgetAmount === 'number') update['qualificationFactors.budgetAmount'] = budgetAmount;
      if (requirements?.length) update['qualificationFactors.requirements'] = requirements;

      const push = note ? { notes: { content: note, authorName: agent.name } } : undefined;
      const lead = await Lead.findOneAndUpdate(
        { _id: conversation.leadId, organizationId },
        { ...(Object.keys(update).length ? { $set: update } : {}), ...(push ? { $push: push } : {}) },
        { new: true }
      );
      emitEvent?.('lead:updated', { lead });
      return JSON.stringify({ updated: true, leadId: String(lead._id), pipelineStage: lead.pipelineStage });
    },
    {
      name: 'updateLead',
      description: 'Update CRM lead details, pipeline stage, requirements, or add a note.',
      schema: z.object({
        pipelineStage: z
          .enum(['new', 'contacted', 'qualified', 'demo_scheduled', 'negotiation', 'converted', 'lost'])
          .optional(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
        budgetAmount: z.number().optional(),
        requirements: z.array(z.string()).optional(),
        note: z.string().optional(),
      }),
    }
  );

  const calculateLeadScoreTool = tool(
    async ({ interest, budgetFit, purchaseTimeline, decisionAuthority, evidence }) => {
      const result = calculateDeterministicLeadScore(
        { interest, budgetFit, purchaseTimeline, decisionAuthority },
        agent.qualificationCriteria?.weights,
        conversation.messageCount || 2
      );

      if (conversation.leadId) {
        const lead = await Lead.findOneAndUpdate(
          { _id: conversation.leadId, organizationId },
          {
            $set: {
              leadScore: result.leadScore,
              leadStatus: result.leadStatus,
              'qualificationFactors.interest': interest,
              'qualificationFactors.budgetFit': budgetFit,
              'qualificationFactors.purchaseTimeline': purchaseTimeline,
              'qualificationFactors.decisionAuthority': decisionAuthority,
              'qualificationFactors.evidence': evidence || [],
              'qualificationFactors.recommendedAction': result.recommendedAction,
              'qualificationFactors.lastEvaluatedAt': new Date(),
              pipelineStage: result.leadScore >= 70 ? 'qualified' : undefined,
            },
          },
          { new: true }
        );
        emitEvent?.('lead:updated', { lead });
      }
      return JSON.stringify(result);
    },
    {
      name: 'calculateLeadScore',
      description: 'Evaluate and store deterministic lead qualification score (0-100) based on discovery factors.',
      schema: z.object({
        interest: z.enum(['high', 'medium', 'low', 'unknown']),
        budgetFit: z.enum(['suitable', 'tight', 'unsuitable', 'unknown']),
        purchaseTimeline: z.enum(['immediate', 'within_30_days', 'within_90_days', 'later', 'unknown']),
        decisionAuthority: z.enum(['decision_maker', 'influencer', 'researcher', 'unknown']),
        evidence: z.array(z.string()).optional(),
      }),
    }
  );

  const analyzeSentimentTool = tool(
    async ({ overall, buyingIntent, concerns, buyingSignals }) => {
      const scoreMap = { positive: 0.75, neutral: 0, negative: -0.6, frustrated: -0.9 };
      await Conversation.findByIdAndUpdate(conversation._id, {
        $set: {
          'sentiment.overall': overall,
          'sentiment.score': scoreMap[overall] ?? 0,
          'sentiment.buyingIntent': buyingIntent,
        },
        $push: {
          'sentiment.timeline': { sentiment: overall, buyingIntent, timestamp: new Date() },
        },
      });
      if (conversation.leadId) {
        await Lead.findByIdAndUpdate(conversation.leadId, {
          $set: {
            'sentiment.overall': overall,
            'sentiment.buyingIntent': buyingIntent,
            'sentiment.concerns': concerns || [],
            'sentiment.buyingSignals': buyingSignals || [],
          },
        });
      }
      emitEvent?.('sentiment:update', {
        conversationId: String(conversation._id),
        overall,
        buyingIntent,
      });
      return JSON.stringify({ recorded: true, overall, buyingIntent });
    },
    {
      name: 'analyzeSentiment',
      description: 'Record customer sentiment, buying intent, concerns, and buying signals from conversation context.',
      schema: z.object({
        overall: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
        buyingIntent: z.enum(['high', 'medium', 'low', 'none']),
        concerns: z.array(z.string()).optional(),
        buyingSignals: z.array(z.string()).optional(),
      }),
    }
  );

  const checkCalendarAvailabilityTool = tool(
    async ({ dateStr, timezone }) => {
      const slots = await checkAvailability({
        organizationId,
        dateStr,
        timezone: timezone || agent.operatingHours?.timezone || 'Asia/Kolkata',
      });
      return JSON.stringify({ date: dateStr, availableSlots: slots });
    },
    {
      name: 'checkCalendarAvailability',
      description: 'Check real-time available 30-minute meeting slots for a given date (YYYY-MM-DD).',
      schema: z.object({
        dateStr: z.string(),
        timezone: z.string().optional(),
      }),
    }
  );

  const bookAppointmentTool = tool(
    async ({ title, startTime, attendeeName, attendeeEmail, timezone }) => {
      if (!conversation.leadId) {
        const created = await Lead.create({
          organizationId,
          name: attendeeName,
          email: attendeeEmail.toLowerCase(),
          source: conversation.activeMode === 'voice' ? 'voice_inbound' : 'text_chat',
          pipelineStage: 'demo_scheduled',
        });
        await Conversation.findByIdAndUpdate(conversation._id, { leadId: created._id });
        conversation.leadId = created._id;
      }

      const start = new Date(startTime);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const conflict = await Appointment.findOne({
        organizationId,
        status: { $in: ['scheduled', 'rescheduled'] },
        startTime: { $lt: end },
        endTime: { $gt: start },
        deletedAt: null,
      });
      if (conflict) {
        return JSON.stringify({ booked: false, reason: 'Selected slot is no longer available.' });
      }

      const calRes = await createCalendarEvent({
        organizationId,
        title,
        description: `Booked by ${agent.name} via SalesPilot AI`,
        startTime: start,
        endTime: end,
        attendeeEmail,
        timezone: timezone || 'Asia/Kolkata',
      });

      const appointment = await Appointment.create({
        organizationId,
        leadId: conversation.leadId,
        conversationId: conversation._id,
        agentId: agent._id,
        title,
        startTime: start,
        endTime: end,
        timezone: timezone || 'Asia/Kolkata',
        attendeeName,
        attendeeEmail,
        meetingLink: calRes.meetingLink,
        googleCalendarEventId: calRes.googleCalendarEventId,
        providerConfirmed: calRes.providerConfirmed,
        idempotencyKey: `${organizationId}-${conversation.leadId}-${start.toISOString()}`,
      });

      await Lead.findByIdAndUpdate(conversation.leadId, { pipelineStage: 'demo_scheduled' });
      emitEvent?.('appointment:booked', { appointment });

      return JSON.stringify({
        booked: true,
        providerConfirmed: appointment.providerConfirmed,
        appointmentId: String(appointment._id),
        startTime: appointment.startTime,
        meetingLink: appointment.meetingLink,
      });
    },
    {
      name: 'bookAppointment',
      description: 'Book a confirmed appointment after verifying availability and getting customer confirmation.',
      schema: z.object({
        title: z.string().min(3),
        startTime: z.string(),
        attendeeName: z.string().min(1),
        attendeeEmail: z.string().email(),
        timezone: z.string().optional(),
      }),
    }
  );

  const rescheduleAppointmentTool = tool(
    async ({ appointmentId, newStartTime, timezone }) => {
      const appt = await Appointment.findOne({ _id: appointmentId, organizationId, deletedAt: null });
      if (!appt) return JSON.stringify({ rescheduled: false, reason: 'Appointment not found' });

      const start = new Date(newStartTime);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      await updateCalendarEvent({
        organizationId,
        eventId: appt.googleCalendarEventId,
        startTime: start,
        endTime: end,
        timezone: timezone || appt.timezone,
      });

      appt.startTime = start;
      appt.endTime = end;
      appt.status = 'rescheduled';
      await appt.save();
      return JSON.stringify({ rescheduled: true, startTime: appt.startTime });
    },
    {
      name: 'rescheduleAppointment',
      description: 'Reschedule an existing appointment to a new start time.',
      schema: z.object({
        appointmentId: z.string(),
        newStartTime: z.string(),
        timezone: z.string().optional(),
      }),
    }
  );

  const cancelAppointmentTool = tool(
    async ({ appointmentId, reason }) => {
      const appt = await Appointment.findOne({ _id: appointmentId, organizationId, deletedAt: null });
      if (!appt) return JSON.stringify({ canceled: false, reason: 'Appointment not found' });

      await deleteCalendarEvent({ organizationId, eventId: appt.googleCalendarEventId });
      appt.status = 'canceled';
      appt.cancelReason = reason || 'Customer requested cancellation';
      await appt.save();
      return JSON.stringify({ canceled: true });
    },
    {
      name: 'cancelAppointment',
      description: 'Cancel an existing appointment.',
      schema: z.object({
        appointmentId: z.string(),
        reason: z.string().optional(),
      }),
    }
  );

  const sendConfirmationEmailTool = tool(
    async ({ to, attendeeName, title, startTime, meetingLink }) => {
      const res = await sendAppointmentConfirmationEmail({
        to,
        attendeeName,
        title,
        startTime,
        meetingLink,
        companyName: agent.companyName,
      });
      return JSON.stringify({ sent: true, mocked: res.mocked });
    },
    {
      name: 'sendConfirmationEmail',
      description: 'Send a confirmation email to the customer for a booked appointment.',
      schema: z.object({
        to: z.string().email(),
        attendeeName: z.string(),
        title: z.string(),
        startTime: z.string(),
        meetingLink: z.string().optional(),
      }),
    }
  );

  const scheduleFollowUpTool = tool(
    async ({ followUpDateIso, note }) => {
      if (conversation.leadId) {
        await Lead.findByIdAndUpdate(conversation.leadId, {
          $set: { nextFollowUpAt: new Date(followUpDateIso) },
          $push: { notes: { content: `Follow-up scheduled: ${note}`, authorName: agent.name } },
        });
      }
      return JSON.stringify({ scheduled: true, followUpDateIso });
    },
    {
      name: 'scheduleFollowUp',
      description: 'Schedule a follow-up reminder for a lead.',
      schema: z.object({
        followUpDateIso: z.string(),
        note: z.string(),
      }),
    }
  );

  const escalateToHumanTool = tool(
    async ({ reason }) => {
      await Conversation.findByIdAndUpdate(conversation._id, {
        status: 'escalated',
        escalationReason: reason,
      });
      await Notification.create({
        organizationId,
        type: 'escalation',
        title: 'Conversation Escalated to Human',
        message: `AI Agent ${agent.name} escalated conversation: ${reason}`,
        entityType: 'Conversation',
        entityId: conversation._id,
      });
      if (agent.escalationRules?.escalateEmail) {
        await sendEmail({
          to: agent.escalationRules.escalateEmail,
          subject: `[SalesPilot Escalation] Customer needs human assistance`,
          html: `<p>Reason: ${reason}</p><p>Conversation ID: ${conversation._id}</p>`,
        }).catch(() => {});
      }
      emitEvent?.('notification:new', { type: 'escalation', reason });
      return JSON.stringify({ escalated: true, reason });
    },
    {
      name: 'escalateToHuman',
      description: 'Escalate the conversation to a human sales representative.',
      schema: z.object({ reason: z.string().min(3) }),
    }
  );

  return [
    searchKnowledgeBase,
    getProductInformation,
    createLeadTool,
    updateLeadTool,
    calculateLeadScoreTool,
    analyzeSentimentTool,
    checkCalendarAvailabilityTool,
    bookAppointmentTool,
    rescheduleAppointmentTool,
    cancelAppointmentTool,
    sendConfirmationEmailTool,
    scheduleFollowUpTool,
    escalateToHumanTool,
  ];
}
