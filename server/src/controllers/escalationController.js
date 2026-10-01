import Complaint from '../models/Complaint.js';
import { logger } from '../config/logger.js';

// SLA days allowed per priority band
const getSLADays = (priority) => {
  if (priority >= 8) return 1;  // high (8-10): 1 day
  if (priority >= 4) return 2;  // medium (4-7): 2 days
  return 3;                      // low (1-3): 3 days
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getEscalatedComplaints = async (req, res) => {
  try {
    const now = new Date();

    // Cutoff timestamps: complaints created before these have already exceeded their SLA
    const cutoff1day = new Date(now - 1 * MS_PER_DAY);  // overdue for priority 8-10
    const cutoff2day = new Date(now - 2 * MS_PER_DAY);  // overdue for priority 4-7
    const cutoff3day = new Date(now - 3 * MS_PER_DAY);  // overdue for priority 1-3

    const slaFilter = {
      status: { $in: ['pending', 'processing'] },
      $or: [
        // High priority (8-10): must resolve within 1 day
        { priority: { $gte: 8 }, createdAt: { $lte: cutoff1day } },
        // Medium priority (4-7): must resolve within 2 days
        { priority: { $gte: 4, $lte: 7 }, createdAt: { $lte: cutoff2day } },
        // Low priority (1-3): must resolve within 3 days
        { priority: { $gte: 1, $lte: 3 }, createdAt: { $lte: cutoff3day } },
        // Legacy/default priority (0 or missing): treat as medium (2-day SLA)
        { $or: [{ priority: 0 }, { priority: { $exists: false } }], createdAt: { $lte: cutoff2day } }
      ]
    };

    // Sub-admins see only their department's escalated complaints
    if (req.user.role === 'sub_admin') {
      slaFilter.department = req.user.department;
    }

    const complaints = await Complaint.find(slaFilter)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate({ path: 'department', select: 'name', model: 'Department' })
      .sort({ priority: -1, createdAt: 1 }); // most urgent first, then oldest-first within same priority

    // Attach SLA metadata to each complaint
    const enriched = complaints.map((c) => {
      const obj = c.toObject();
      const priority = typeof c.priority === 'number' && c.priority > 0 ? c.priority : 5;
      const slaDays = getSLADays(priority);
      const slaDeadline = new Date(c.createdAt.getTime() + slaDays * MS_PER_DAY);
      const overdueMs = now - slaDeadline;
      const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));

      return {
        ...obj,
        complaintId: c.complaintId,
        slaDays,
        slaDeadline,
        overdueHours,
        overdueDays: Math.floor(overdueHours / 24)
      };
    });

    logger.info(`Escalated complaints fetched`, {
      requestedBy: req.user.email,
      role: req.user.role,
      count: enriched.length
    });

    res.json({
      success: true,
      data: {
        escalatedComplaints: enriched,
        total: enriched.length,
        summary: {
          high: enriched.filter(c => (c.priority ?? 5) >= 8).length,
          medium: enriched.filter(c => (c.priority ?? 5) >= 4 && (c.priority ?? 5) < 8).length,
          low: enriched.filter(c => (c.priority ?? 5) < 4).length
        }
      }
    });
  } catch (error) {
    logger.error('Get escalated complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escalated complaints'
    });
  }
};
