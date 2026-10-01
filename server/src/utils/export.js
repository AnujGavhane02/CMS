import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';

// Export complaints to PDF
export const exportComplaintsToPDF = async (complaints, filename = 'complaints.pdf') => {
  try {
    const doc = new PDFDocument();
    const outputPath = path.join(process.cwd(), 'exports', filename);
    
    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Add title
    doc.fontSize(20).text('Complaints Report', { align: 'center' });
    doc.moveDown();

    // Add generation date
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(2);

    // Add complaints data
    complaints.forEach((complaint, index) => {
      doc.fontSize(14).text(`${index + 1}. ${complaint.title}`, { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(10).text(`ID: ${complaint.complaintId || complaint._id}`);
      doc.text(`Category: ${complaint.category}`);
      doc.text(`Status: ${complaint.status.toUpperCase()}`);
      doc.text(`Urgency: ${complaint.urgency.toUpperCase()}`);
      doc.text(`Created: ${new Date(complaint.createdAt).toLocaleDateString()}`);
      
      if (complaint.resolvedAt) {
        doc.text(`Resolved: ${new Date(complaint.resolvedAt).toLocaleDateString()}`);
      }
      
      doc.moveDown(0.5);
      doc.text(`Description: ${complaint.description}`);
      doc.moveDown(1);
      
      if (complaint.feedback) {
        doc.text(`Feedback: ${complaint.feedback.rating}/5 - ${complaint.feedback.comment || 'No comment'}`);
        doc.moveDown(1);
      }
      
      // Add page break if not last complaint
      if (index < complaints.length - 1) {
        doc.addPage();
      }
    });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        logger.info(`PDF exported successfully: ${outputPath}`);
        resolve(outputPath);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    logger.error('PDF export failed:', error);
    throw error;
  }
};

// Export complaints to Excel
export const exportComplaintsToExcel = async (complaints, filename = 'complaints.xlsx') => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Complaints');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Urgency', key: 'urgency', width: 10 },
      { header: 'User', key: 'userName', width: 25 },
      { header: 'Created', key: 'createdAt', width: 15 },
      { header: 'Resolved', key: 'resolvedAt', width: 15 },
      { header: 'Resolution Time (Days)', key: 'resolutionTime', width: 20 },
      { header: 'Feedback Rating', key: 'feedbackRating', width: 15 },
      { header: 'Description', key: 'description', width: 50 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    complaints.forEach(complaint => {
      const resolutionTime = complaint.resolvedAt && complaint.createdAt 
        ? Math.ceil((new Date(complaint.resolvedAt) - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24))
        : null;

      worksheet.addRow({
        id: complaint.complaintId || complaint._id,
        title: complaint.title,
        category: complaint.category,
        status: complaint.status.toUpperCase(),
        urgency: complaint.urgency.toUpperCase(),
        userName: complaint.userName,
        createdAt: new Date(complaint.createdAt).toLocaleDateString(),
        resolvedAt: complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleDateString() : 'N/A',
        resolutionTime: resolutionTime || 'N/A',
        feedbackRating: complaint.feedback?.rating || 'N/A',
        description: complaint.description
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width, 10);
    });

    // Save file
    const outputPath = path.join(process.cwd(), 'exports', filename);
    
    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(outputPath);
    
    logger.info(`Excel file exported successfully: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Excel export failed:', error);
    throw error;
  }
};

// Export analytics to PDF
export const exportAnalyticsToPDF = async (analytics, filename = 'analytics.pdf') => {
  try {
    const doc = new PDFDocument();
    const outputPath = path.join(process.cwd(), 'exports', filename);
    
    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Add title
    doc.fontSize(20).text('Analytics Report', { align: 'center' });
    doc.moveDown();

    // Add generation date
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(2);

    // Add dashboard stats
    if (analytics.dashboard) {
      doc.fontSize(16).text('Dashboard Statistics', { underline: true });
      doc.moveDown(0.5);
      
      const stats = analytics.dashboard;
      doc.fontSize(12).text(`Total Complaints: ${stats.totalComplaints}`);
      doc.text(`Pending: ${stats.pending}`);
      doc.text(`Processing: ${stats.processing}`);
      doc.text(`Resolved: ${stats.resolved}`);
      doc.text(`Average Resolution Time: ${stats.avgResolutionTime?.toFixed(1) || 'N/A'} days`);
      doc.text(`Satisfaction Rate: ${stats.satisfactionRate?.toFixed(1) || 'N/A'}/5`);
      doc.moveDown(2);
    }

    // Add category breakdown
    if (analytics.byCategory) {
      doc.fontSize(16).text('Complaints by Category', { underline: true });
      doc.moveDown(0.5);
      
      analytics.byCategory.forEach(category => {
        doc.fontSize(12).text(`${category._id}: ${category.total} complaints`);
      });
      doc.moveDown(2);
    }

    // Add monthly trends
    if (analytics.monthlyTrends) {
      doc.fontSize(16).text('Monthly Trends', { underline: true });
      doc.moveDown(0.5);
      
      analytics.monthlyTrends.forEach(trend => {
        doc.fontSize(12).text(`${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}: ${trend.total} complaints`);
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        logger.info(`Analytics PDF exported successfully: ${outputPath}`);
        resolve(outputPath);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    logger.error('Analytics PDF export failed:', error);
    throw error;
  }
};

// Generate summary report
export const generateSummaryReport = async (data) => {
  try {
    const report = {
      generatedAt: new Date(),
      summary: {
        totalComplaints: data.complaints?.length || 0,
        totalUsers: data.users?.length || 0,
        departments: [...new Set(data.complaints?.map(c => c.category) || [])],
        statusBreakdown: {},
        urgencyBreakdown: {}
      }
    };

    // Calculate status breakdown
    if (data.complaints) {
      data.complaints.forEach(complaint => {
        report.summary.statusBreakdown[complaint.status] = 
          (report.summary.statusBreakdown[complaint.status] || 0) + 1;
        
        report.summary.urgencyBreakdown[complaint.urgency] = 
          (report.summary.urgencyBreakdown[complaint.urgency] || 0) + 1;
      });
    }

    return report;
  } catch (error) {
    logger.error('Summary report generation failed:', error);
    throw error;
  }
};
