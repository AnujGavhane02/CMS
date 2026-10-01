import { GoogleGenAI } from '@google/genai';
import { logger } from '../config/logger.js';
import Complaint from '../models/Complaint.js';
import Department from '../models/Department.js';
import User from '../models/User.js';

/**
 * POST /api/chat
 * Send a message to the CMS chatbot (powered by Gemini)
 */
export const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const user = req.user; // Set by authenticateToken or optionalAuth middleware if logged in
    const userName = user ? user.name : 'Guest';
    const userEmail = user ? user.email : 'Not logged in';
    const userRole = user ? user.role : 'guest';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a string',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY is not configured');
      return res.status(500).json({
        success: false,
        message: 'Chatbot is temporarily unavailable. Please try again later.',
      });
    }

    // ── Build Live Dynamic Context from DB ────────────────────────────────────
    let complaintsContext = '';
    let departmentsContext = '';
    let specificComplaintContext = '';
    let statsContext = '';

    // 1. Fetch active departments
    try {
      const depts = await Department.find({ isActive: true }).select('name description categories');
      departmentsContext = depts
        .map(
          (d) =>
            `- ${d.name}: ${d.description || 'No description'} (Categories: ${(d.categories || []).join(', ') || 'None'})`
        )
        .join('\n');
    } catch (e) {
      logger.warn('Chat context - department fetch failed:', e);
    }

    // 2. Fetch specific complaint if ID mentioned (e.g. CMP-A2F8B3)
    const cmpMatch = message.match(/CMP-([0-9A-Fa-f]{6})/i);
    if (cmpMatch) {
      try {
        const hexSuffix = cmpMatch[1].toLowerCase();
        const allMatches = await Complaint.find({}).populate('department', 'name');
        const found = allMatches.find((c) => c._id.toString().slice(-6).toLowerCase() === hexSuffix);

        if (found) {
          // Check access authorization
          const hasAccess =
            user && (
              user.role === 'master_admin' ||
              (user.role === 'sub_admin' && found.department?._id?.toString() === user.department?.toString()) ||
              (user.role === 'user' && found.userId.toString() === user._id.toString())
            );

          if (hasAccess) {
            specificComplaintContext = `
[LIVE COMPLAINT SEARCH RESULT]
The user is asking about or referencing Complaint ID: ${cmpMatch[0]}
Here are the live database details:
- ID: ${cmpMatch[0]}
- Title: ${found.title}
- Description: ${found.description}
- Status: ${found.status.toUpperCase()}
- Department: ${found.department?.name || 'Unknown'}
- Urgency: ${found.urgency}
- Priority score: ${found.priority || 'N/A'}/10
- Created At: ${found.createdAt.toLocaleString()}
- Last Updated: ${found.updatedAt.toLocaleString()}
- Status History: ${found.statusHistory
              .map(
                (h) =>
                  `[${new Date(h.timestamp).toLocaleDateString()}] ${h.status.toUpperCase()}${
                    h.notes && h.isVisibleToUser ? ` (Note: ${h.notes})` : ''
                  }`
              )
              .join(' -> ')}
`;
          }
        }
      } catch (e) {
        logger.warn('Chat context - specific complaint lookup failed:', e);
      }
    }

    // 3. Fetch user's own complaints (limit 5)
    if (user && user.role === 'user') {
      try {
        const myComplaints = await Complaint.find({ userId: user.id })
          .populate('department', 'name')
          .sort({ createdAt: -1 })
          .limit(5);

        if (myComplaints.length > 0) {
          complaintsContext = myComplaints
            .map((c) => {
              const cid = `CMP-${c._id.toString().slice(-6).toUpperCase()}`;
              return `- ${cid}: "${c.title}" | Status: ${c.status.toUpperCase()} | Department: ${
                c.department?.name || 'N/A'
              } | Submitted: ${c.createdAt.toLocaleDateString()}`;
            })
            .join('\n');
        } else {
          complaintsContext = 'You have not submitted any complaints yet.';
        }
      } catch (e) {
        logger.warn('Chat context - user complaints lookup failed:', e);
      }
    }

    // 4. Fetch general stats if admin
    if (user && (user.role === 'master_admin' || user.role === 'sub_admin')) {
      try {
        const statsFilter = user.role === 'sub_admin' ? { department: user.department } : {};
        const total = await Complaint.countDocuments(statsFilter);
        const pending = await Complaint.countDocuments({ ...statsFilter, status: 'pending' });
        const processing = await Complaint.countDocuments({ ...statsFilter, status: 'processing' });
        const resolved = await Complaint.countDocuments({ ...statsFilter, status: 'resolved' });
        const rejected = await Complaint.countDocuments({ ...statsFilter, status: 'rejected' });

        statsContext = `
[SYSTEM LIVE STATISTICS]
Since you are logged in as an administrator (${user.role.replace('_', ' ')}), here is the live database status summary for your reference:
- Total complaints in scope: ${total}
- Pending count: ${pending}
- Processing count: ${processing}
- Resolved count: ${resolved}
- Rejected count: ${rejected}
`;
      } catch (e) {
        logger.warn('Chat context - system stats calculation failed:', e);
      }
    }

    const CMS_SYSTEM_PROMPT = `You are a helpful, professional CMS (Complaint Management System) AI Assistant for an educational institute.
You are conversing with the following user:
- Name: ${userName}
- Email: ${userEmail}
- Role: ${userRole.toUpperCase()}
${user && user.role === 'sub_admin' ? `- Assigned Department ID: ${user.department}` : ''}

## Active Departments in the System
${departmentsContext || '- No active departments found.'}

${user && user.role === 'user' ? `## Live Complaints Submitted by this User:\n${complaintsContext}` : ''}
${statsContext}
${specificComplaintContext}

## Standard CMS Guidelines & Knowledge Base:
- Urgency Resolution Targets: Low (5-7 days), Medium (3-5 days), High (1-2 days).
- Complaints can be submitted anonymously (their real identity is hidden from normal sub-admins but visible to master admin for validation).
- Standard Status Progression: Pending → Processing → Resolved or Rejected.
- Explain processes using clean bullet points.
- You can query and discuss complaint statuses dynamically using the live information provided above.
- Be friendly, concise, and professional. Keep replies under 200 words.`;

    const ai = new GoogleGenAI({ apiKey });

    // Build contents: system prompt + history + current message
    const contents = [
      { role: 'user', parts: [{ text: CMS_SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: `I understand. I am your CMS assistant. Hello ${userName}, how can I help you today?` }] },
      ...history.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
    });

    const text = response.text?.trim() || 'I apologize, I could not generate a response. Please try again.';

    return res.json({
      success: true,
      data: { response: text },
    });
  } catch (err) {
    logger.error('Chat API error:', err);

    const status = err?.status === 429 ? 429 : 500;
    const message =
      err?.status === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : 'Unable to get a response. Please try again later.';

    return res.status(status).json({
      success: false,
      message,
    });
  }
};
