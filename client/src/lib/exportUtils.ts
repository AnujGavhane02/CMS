import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Complaint } from './types';

export const exportComplaintsToExcel = (complaints: Complaint[], filename: string = 'complaints') => {
  const data = complaints.map(complaint => ({
    'ID': complaint.complaintId || complaint.id,
    'Title': complaint.title,
    'Description': complaint.description,
    'Category': complaint.category,
    'Status': complaint.status,
    'Urgency': complaint.urgency,
    'User': complaint.isAnonymous ? 'Anonymous' : complaint.userName,
    'Email': complaint.isAnonymous ? 'Hidden' : complaint.userEmail,
    'Created At': new Date(complaint.createdAt).toLocaleString(),
    'Updated At': new Date(complaint.updatedAt).toLocaleString(),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
  
  // Auto-size columns
  const maxWidth = data.reduce((w, r) => Math.max(w, r.Description.length), 10);
  ws['!cols'] = [
    { wch: 15 }, // ID
    { wch: 30 }, // Title
    { wch: Math.min(maxWidth, 50) }, // Description
    { wch: 20 }, // Category
    { wch: 15 }, // Status
    { wch: 15 }, // Urgency
    { wch: 20 }, // User
    { wch: 25 }, // Email
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportComplaintsToPDF = (complaints: Complaint[], filename: string = 'complaints') => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(18);
  doc.text('Complaints Report', 14, 15);
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  const tableData = complaints.map(complaint => [
    complaint.complaintId || complaint.id,
    complaint.title,
    complaint.category,
    complaint.status,
    complaint.urgency,
    complaint.isAnonymous ? 'Anonymous' : complaint.userName,
    new Date(complaint.createdAt).toLocaleDateString(),
  ]);

  autoTable(doc, {
    head: [['ID', 'Title', 'Category', 'Status', 'Urgency', 'User', 'Created']],
    body: tableData,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 35 },
      6: { cellWidth: 25 },
    },
  });

  doc.save(`${filename}.pdf`);
};

export const exportSingleComplaintToPDF = (complaint: Complaint, showUserInfo: boolean = false) => {
  const doc = new jsPDF();
  
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Complaint Details', 14, yPosition);
  yPosition += 10;

  // Complaint ID
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Complaint ID: ${complaint.complaintId || complaint.id}`, 14, yPosition);
  yPosition += 10;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Title:', 14, yPosition);
  yPosition += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(complaint.title, 180);
  doc.text(titleLines, 14, yPosition);
  yPosition += titleLines.length * 6 + 5;

  // Description
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Description:', 14, yPosition);
  yPosition += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(complaint.description, 180);
  doc.text(descLines, 14, yPosition);
  yPosition += descLines.length * 6 + 5;

  // Details section
  yPosition += 5;
  const details = [
    ['Category', complaint.category],
    ['Status', complaint.status.toUpperCase()],
    ['Urgency', complaint.urgency.toUpperCase()],
    ['Created At', new Date(complaint.createdAt).toLocaleString()],
    ['Updated At', new Date(complaint.updatedAt).toLocaleString()],
  ];

  // Only add user info if showUserInfo is true and not anonymous
  if (showUserInfo) {
    details.push(['User', complaint.isAnonymous ? 'Anonymous' : complaint.userName]);
    details.push(['Email', complaint.isAnonymous ? 'Hidden' : complaint.userEmail]);
  }

  autoTable(doc, {
    body: details,
    startY: yPosition,
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', fillColor: [240, 240, 240] },
      1: { cellWidth: 150 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Status History
  if (complaint.statusHistory && complaint.statusHistory.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Status History:', 14, yPosition);
    yPosition += 5;

    const historyData = complaint.statusHistory.map(history => [
      history.status.toUpperCase(),
      history.notes || '-',
      showUserInfo ? (history.updatedBy || '-') : '-',
      new Date(history.timestamp).toLocaleString(),
    ]);

    const historyHeaders = showUserInfo 
      ? [['Status', 'Notes', 'Updated By', 'Timestamp']]
      : [['Status', 'Notes', 'Timestamp']];

    const historyColumns = showUserInfo
      ? {
          0: { cellWidth: 30 },
          1: { cellWidth: 70 },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 },
        }
      : {
          0: { cellWidth: 35 },
          1: { cellWidth: 100 },
          2: { cellWidth: 55 },
        };

    autoTable(doc, {
      head: historyHeaders,
      body: showUserInfo ? historyData : historyData.map(row => [row[0], row[1], row[3]]),
      startY: yPosition,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: historyColumns,
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Feedback
  if (complaint.feedback && yPosition < 260) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('User Feedback:', 14, yPosition);
    yPosition += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Rating: ${complaint.feedback.rating}/5`, 14, yPosition);
    yPosition += 6;
    doc.text(`Sentiment: ${complaint.feedback.sentiment}`, 14, yPosition);
    yPosition += 6;
    const feedbackLines = doc.splitTextToSize(complaint.feedback.comment, 180);
    doc.text(feedbackLines, 14, yPosition);
  }

  doc.save(`complaint-${complaint.complaintId || complaint.id}.pdf`);
};
