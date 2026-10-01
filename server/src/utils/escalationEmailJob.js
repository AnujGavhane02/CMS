import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import { logger } from '../config/logger.js';
import { sendEscalationAlertEmail } from './email.js';

const getSLACutoffs = () => {
  const now = Date.now();
  return {
    p1: new Date(now - 3 * 24 * 60 * 60 * 1000), // priority 1-3: 3 days
    p2: new Date(now - 2 * 24 * 60 * 60 * 1000), // priority 4-7: 2 days
    p3: new Date(now - 1 * 24 * 60 * 60 * 1000)  // priority 8-10: 1 day
  };
};

const getSLADays = (priority) => {
  if (priority >= 8) return 1;
  if (priority >= 4) return 2;
  return 3;
};

const getOverdueHours = (complaint) => {
  const slaDays = getSLADays(complaint.priority);
  const deadline = new Date(complaint.createdAt.getTime() + slaDays * 24 * 60 * 60 * 1000);
  return Math.floor((Date.now() - deadline.getTime()) / (1000 * 60 * 60));
};

// Enrich complaint with virtual fields needed by the email template
const enrichComplaint = (complaint) => ({
  ...complaint.toObject({ virtuals: true }),
  complaintId: `CMP-${complaint._id.toString().slice(-6).toUpperCase()}`,
  overdueHours: getOverdueHours(complaint),
  slaDays: getSLADays(complaint.priority)
});

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours between escalation emails per complaint

export const runEscalationEmailJob = async () => {
  try {
    const { p1, p2, p3 } = getSLACutoffs();
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS);

    // Find SLA-breached complaints that haven't had an escalation email in the last 24h
    const escalated = await Complaint.find({
      status: { $in: ['pending', 'processing'] },
      $and: [
        {
          $or: [
            { priority: { $lte: 3 }, createdAt: { $lte: p1 } },
            { priority: { $gte: 4, $lte: 7 }, createdAt: { $lte: p2 } },
            { priority: { $gte: 8 }, createdAt: { $lte: p3 } }
          ]
        },
        {
          $or: [
            { escalationEmailSentAt: null },
            { escalationEmailSentAt: { $lte: cooldownCutoff } }
          ]
        }
      ]
    });

    if (escalated.length === 0) return;

    logger.info(`Escalation job: ${escalated.length} SLA-breached complaint(s) found`);

    const enriched = escalated.map(enrichComplaint);

    // Email all master admins with the full list
    const masterAdmins = await User.findByRole('master_admin');
    for (const admin of masterAdmins) {
      await sendEscalationAlertEmail(enriched, admin)
        .catch(err => logger.error(`Escalation email to master_admin ${admin.email} failed:`, err));
    }

    // Group by department and email relevant sub-admins
    const byDept = enriched.reduce((acc, c) => {
      const key = c.department?.toString();
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {});

    for (const [deptId, deptComplaints] of Object.entries(byDept)) {
      const subAdmins = await User.findSubAdminsByDepartment(deptId);
      for (const sa of subAdmins) {
        await sendEscalationAlertEmail(deptComplaints, sa)
          .catch(err => logger.error(`Escalation email to sub_admin ${sa.email} failed:`, err));
      }
    }

    // Mark complaints as emailed
    const ids = escalated.map(c => c._id);
    await Complaint.updateMany(
      { _id: { $in: ids } },
      { escalationEmailSentAt: new Date() }
    );

    logger.info(`Escalation job: emails sent, ${ids.length} complaint(s) marked`);
  } catch (err) {
    logger.error('Escalation email job error:', err);
  }
};

// Start recurring job — runs every hour
export const startEscalationEmailJob = () => {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  logger.info('Escalation email job started (interval: 1h)');
  // Run once immediately after boot, then on interval
  setTimeout(() => {
    runEscalationEmailJob();
    setInterval(runEscalationEmailJob, INTERVAL_MS);
  }, 30 * 1000); // 30-second delay on startup to let DB connect
};
