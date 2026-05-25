import PDFDocument from 'pdfkit';

export interface NoteEntry {
  sessionDate: Date;
  sessionIndex: number;  // position in DESC order; 1 = most recent
  totalSessions: number;
  durationMin: number;
  mode: string;
  status: string;
  professionalName: string;
  techniqueUsed?: string | null;
  patientMood?: number | null;
  content?: string | null;
  nextSteps?: string | null;
}

export interface ClinicalPdfData {
  clinicName: string;
  patientName: string;
  patientBirthDate?: Date | null;
  notes: NoteEntry[];
  generatedAt: Date;
}

const FOREST  = '#2D5016';
const SAGE    = '#6B8E7F';
const INK     = '#2D3B36';
const MUTED   = '#7A8B85';
const WARM_BG = '#F5F1E8';
const DIVIDER = '#D5E3D6';

function moodDots(mood: number): string {
  return '●'.repeat(mood) + '○'.repeat(5 - mood);
}

function formatDatePt(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}

function formatTimePt(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export async function generateClinicalPdf(data: ClinicalPdfData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
      info: {
        Title:   `Prontuário Clínico — ${data.patientName}`,
        Author:  'Prontua',
        Subject: 'Prontuário Clínico Confidencial',
        Creator: 'Prontua Clinical SaaS',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const INNER = W - 100; // left + right margin of 50 each

    // ── Header band ───────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 68).fill(FOREST);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text('PRONTUA', 50, 16);
    doc.font('Helvetica').fontSize(9).fillColor('#CDDECE').text(data.clinicName, 50, 38);
    doc.font('Helvetica').fontSize(7.5).fillColor('#A8C5A8').text('PRONTUÁRIO CLÍNICO CONFIDENCIAL', 50, 52);

    doc.y = 84;
    doc.fillColor(INK);

    // ── Patient block ─────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(15).fillColor(FOREST).text(data.patientName, 50);
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);

    if (data.patientBirthDate) {
      const age = Math.floor(
        (data.generatedAt.getTime() - data.patientBirthDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      );
      doc.text(
        `Nascimento: ${data.patientBirthDate.toLocaleDateString('pt-BR')} (${age} anos)`,
        50,
      );
    }
    doc.text(`Sessões com registro: ${data.notes.length}`, 50);
    doc.text(
      `Gerado em: ${data.generatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      50,
    );

    doc.moveDown(0.6);
    doc.moveTo(50, doc.y).lineTo(W - 50, doc.y).lineWidth(0.5).stroke(DIVIDER);
    doc.moveDown(0.6);

    // ── Sessions ──────────────────────────────────────────────────────────────
    for (let i = 0; i < data.notes.length; i++) {
      const n = data.notes[i]!;
      const sessionNum = data.notes.length - i; // chronological number

      // Ensure we have space for at least the header band + a few lines
      const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
      if (remaining < 110) {
        doc.addPage();
        doc.y = 50;
      }

      // Session header band
      const hY = doc.y;
      doc.rect(50, hY, INNER, 22).fill(WARM_BG);
      doc.fillColor(FOREST)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(
          `Sessão ${sessionNum}  ·  ${formatDatePt(n.sessionDate)}  ·  ${formatTimePt(n.sessionDate)}`,
          58,
          hY + 7,
          { width: INNER - 16 },
        );
      doc.y = hY + 28;

      // Metadata line
      const meta: string[] = [
        `Prof.: ${n.professionalName}`,
        n.mode === 'ONLINE' ? 'Online' : 'Presencial',
        `${n.durationMin}min`,
      ];
      if (n.techniqueUsed) meta.push(`Técnica: ${n.techniqueUsed}`);
      if (n.patientMood)   meta.push(`Humor: ${n.patientMood}/5  ${moodDots(n.patientMood)}`);

      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(meta.join('   ·   '), 50, doc.y, {
        width: INNER,
      });
      doc.moveDown(0.5);

      // Content
      if (n.content?.trim()) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#374151').text('Evolução clínica:', 50);
        doc.moveDown(0.15);
        doc.font('Helvetica').fontSize(9).fillColor(INK).text(n.content, 50, doc.y, {
          width:   INNER,
          lineGap: 1.5,
        });
      } else {
        doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('[Sem anotação registrada]', 50);
      }

      // Next steps
      if (n.nextSteps?.trim()) {
        doc.moveDown(0.4);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#374151').text('Próximos passos:', 50);
        doc.moveDown(0.15);
        doc.font('Helvetica').fontSize(9).fillColor(SAGE).text(n.nextSteps, 50, doc.y, {
          width:   INNER,
          lineGap: 1.5,
        });
      }

      doc.moveDown(0.5);

      if (i < data.notes.length - 1) {
        doc.moveTo(50, doc.y).lineTo(W - 50, doc.y).lineWidth(0.3).stroke('#E5E7EB');
        doc.moveDown(0.5);
      }
    }

    // ── Page footers ─────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const fy = doc.page.height - 28;
      doc.moveTo(50, fy - 6).lineTo(W - 50, fy - 6).lineWidth(0.3).stroke('#E5E7EB');
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(
        `Documento confidencial – uso exclusivo do profissional de saúde e paciente · LGPD Art. 11, §1º  |  Página ${i + 1} de ${range.count}`,
        50,
        fy,
        { align: 'center', width: INNER },
      );
    }

    doc.end();
  });
}
