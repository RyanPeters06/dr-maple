import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TriageResult } from '../constants';
import type { TranscriptMessage } from '../hooks/useGemini';

export interface ReportData {
  patientName: string;
  patientEmail?: string;
  date: string;
  duration?: number;
  triageResult: TriageResult;
  transcript?: TranscriptMessage[];
}

const URGENCY_COLORS: Record<string, [number, number, number]> = {
  Emergency:    [220, 38, 38],
  Urgent:       [234, 88, 12],
  'Semi-urgent':[202, 138, 4],
  'Non-urgent': [22, 163, 74],
};

const TEAL: [number, number, number] = [13, 148, 136];
const DARK: [number, number, number] = [17, 24, 39];

export const generateHealthReport = (data: ReportData): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageW, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Dr. Nova', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Health Triage Report', margin, 27);
  doc.text('Not a medical diagnosis — for triage guidance only', margin, 33);

  // Maple leaf
  doc.setFontSize(24);
  doc.text('🍁', pageW - margin - 10, 24);

  // ── Patient info ─────────────────────────────────────────────────────────────
  let y = 52;
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Name: ${data.patientName}`, margin, y); y += 5;
  doc.text(`Date: ${data.date}`, margin, y); y += 5;
  if (data.duration) {
    const m = Math.floor(data.duration / 60);
    const s = data.duration % 60;
    doc.text(`Session Duration: ${m}m ${s}s`, margin, y); y += 5;
  }
  if (data.patientEmail) {
    doc.text(`Email: ${data.patientEmail}`, margin, y); y += 5;
  }

  // ── Urgency badge ─────────────────────────────────────────────────────────────
  y += 4;
  const urgency = data.triageResult.urgency;
  const urgencyColor = URGENCY_COLORS[urgency] ?? [100, 100, 100];

  doc.setFillColor(...urgencyColor);
  doc.roundedRect(margin, y, 80, 12, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Urgency Level: ${urgency}`, margin + 4, y + 8);
  y += 18;

  // ── Recommended action ────────────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommended Action', margin, y);
  y += 6;

  doc.setFillColor(240, 253, 250);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
  doc.setTextColor(13, 78, 74);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.triageResult.action, margin + 4, y + 9);
  y += 20;

  // ── Vitals table ─────────────────────────────────────────────────────────────
  const v = data.triageResult.vitals_noted;
  if (v && (v.heartRate || v.breathingRate || v.stressLevel)) {
    autoTable(doc, {
      startY: y,
      head: [['Vital Sign', 'Recorded Value', 'Status']],
      body: [
        ['Heart Rate', v.heartRate ? `${v.heartRate} bpm` : 'N/A',
          v.heartRate ? (v.heartRate > 100 || v.heartRate < 50 ? '⚠️ Abnormal' : '✅ Normal') : '—'],
        ['Breathing Rate', v.breathingRate ? `${v.breathingRate} breaths/min` : 'N/A',
          v.breathingRate ? (v.breathingRate > 20 || v.breathingRate < 12 ? '⚠️ Abnormal' : '✅ Normal') : '—'],
        ['Stress Level', v.stressLevel ? `${v.stressLevel}/100` : 'N/A',
          v.stressLevel ? (v.stressLevel > 70 ? '⚠️ Elevated' : '✅ Moderate') : '—'],
      ],
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── Symptoms ─────────────────────────────────────────────────────────────────
  if (data.triageResult.symptoms.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Reported Symptoms']],
      body: data.triageResult.symptoms.map(s => [s]),
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── AI Summary ───────────────────────────────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setTextColor(...DARK);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Assessment Summary', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryLines = doc.splitTextToSize(data.triageResult.summary, contentW);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 6;

  // ── Advice ───────────────────────────────────────────────────────────────────
  if (data.triageResult.advice) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Dr. Nova\'s Advice', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const adviceLines = doc.splitTextToSize(data.triageResult.advice, contentW);
    doc.text(adviceLines, margin, y);
    y += adviceLines.length * 5 + 6;
  }

  // ── Canadian resource ─────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, 'F');
  doc.setTextColor(13, 78, 74);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('🍁 Canadian Health Resource:', margin + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(data.triageResult.canadian_resource, margin + 4, y + 13);
  y += 24;

  // ── Transcript (optional, new page) ──────────────────────────────────────────
  if (data.transcript && data.transcript.length > 0) {
    doc.addPage();
    doc.setTextColor(...DARK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Session Transcript', margin, 20);

    autoTable(doc, {
      startY: 26,
      head: [['Speaker', 'Message']],
      body: data.transcript.map(m => [
        m.role === 'doctor' ? '🩺 Dr. Nova' : '🧑 Patient',
        m.text,
      ]),
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: contentW - 30 } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, overflow: 'linebreak' },
    });
  }

  // ── Footer on each page ───────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      'DISCLAIMER: This report is generated by an AI assistant and is NOT a medical diagnosis. ' +
      'Always consult a licensed healthcare professional. In emergencies, call 911.',
      margin, pageH - 10,
      { maxWidth: contentW }
    );
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' });
  }

  doc.save(`Dr-Nova-Report-${data.date.replace(/\//g, '-')}-${Date.now()}.pdf`);
};
