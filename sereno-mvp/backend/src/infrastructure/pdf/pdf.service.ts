import puppeteer from 'puppeteer';
import { logger } from '@shared/utils/logger';

/**
 * Serviço de geração de PDF clínico oficial.
 *
 * Gera um documento com papel timbrado que segue os padrões do
 * CFP (Resolução nº 1/2009), CREFITO e demais conselhos profissionais
 * de saúde brasileiros.
 *
 * Layout:
 *  - Cabeçalho institucional (timbre, logo, dados do profissional)
 *  - Seções de prontuário em tipografia serifada
 *  - Rodapé com declaração de conformidade LGPD e numeração de páginas
 *  - Margens formais de 20mm em todas as bordas
 */

export interface ClinicalPdfOptions {
  professionalName: string;
  professionalRegistry: string;   // CRP/CREFITO/CRM/etc.
  specialty: string;
  clinicName: string;
  clinicCnpj?: string;
  clinicAddress?: string;
  patientName: string;
  sessionDate: Date;
  reportMarkdown: string;
  logoBase64?: string;             // Logo da clínica em base64 (opcional)
}

/**
 * Converte Markdown clínico em HTML com semântica para impressão.
 * Evita dependência de marked/remark no runtime para manter bundle enxuto.
 */
function markdownToHtml(md: string): string {
  return md
    // h2 → section headers
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // blockquotes (usados nas instruções para descrever seções, mas não no output)
    .replace(/^> (.+)$/gm, '<p class="hint">$1</p>')
    // negrito
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // itálico / not-informed placeholder
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // bullet lists
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>[\n]?)+/g, '<ul>$&</ul>')
    // parágrafos (linhas não-vazias que não começam com tag HTML)
    .replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>')
    // quebras duplas → espaçamento visual
    .replace(/\n{2,}/g, '\n');
}

function buildHtml(opts: ClinicalPdfOptions): string {
  const {
    professionalName,
    professionalRegistry,
    specialty,
    clinicName,
    clinicCnpj,
    clinicAddress,
    patientName,
    sessionDate,
    reportMarkdown,
    logoBase64,
  } = opts;

  const formattedDate = sessionDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const generatedAt = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  const logoHtml = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo ${clinicName}" class="logo" />`
    : `<div class="logo-placeholder">${clinicName.charAt(0).toUpperCase()}</div>`;

  const reportHtml = markdownToHtml(reportMarkdown);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Prontuário Clínico — ${patientName}</title>
  <style>
    /* ── Tipografia ── */
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      font-family: 'Crimson Pro', 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1a1a1a;
      background: #ffffff;
    }

    /* ── Margens formais 20mm ── */
    @page {
      size: A4;
      margin: 20mm 20mm 28mm 20mm;
      @bottom-center {
        content: "Página " counter(page) " de " counter(pages);
        font-family: 'Crimson Pro', Georgia, serif;
        font-size: 9pt;
        color: #555;
      }
    }

    .page-wrapper {
      width: 100%;
      min-height: 100%;
      position: relative;
    }

    /* ── Timbre / Cabeçalho ── */
    .letterhead {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2px solid #1b4332;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }

    .logo {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border-radius: 4px;
    }

    .logo-placeholder {
      width: 56px;
      height: 56px;
      background: #1b4332;
      color: #fff;
      font-size: 28pt;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .clinic-info {
      flex: 1;
    }

    .clinic-name {
      font-size: 15pt;
      font-weight: 700;
      color: #1b4332;
      line-height: 1.2;
    }

    .clinic-details {
      font-size: 8.5pt;
      color: #444;
      margin-top: 3px;
      line-height: 1.4;
    }

    .professional-badge {
      text-align: right;
      font-size: 9pt;
      color: #333;
      line-height: 1.5;
    }

    .professional-badge strong {
      color: #1b4332;
      font-size: 10pt;
    }

    /* ── Título do documento ── */
    .doc-title {
      text-align: center;
      margin: 18px 0 14px;
      border: 1px solid #ccc;
      padding: 10px 0;
      background: #f9f9f7;
    }

    .doc-title h1 {
      font-size: 14pt;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #1a1a1a;
    }

    .doc-title p {
      font-size: 9pt;
      color: #555;
      margin-top: 3px;
    }

    /* ── Identificação do paciente ── */
    .patient-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      font-size: 10pt;
      border: 1px solid #ddd;
      padding: 10px 14px;
      border-radius: 2px;
      background: #fafaf8;
      margin-bottom: 20px;
    }

    .patient-block .field-label {
      font-weight: 600;
      color: #444;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .patient-block .field-value {
      color: #1a1a1a;
    }

    /* ── Corpo do relatório ── */
    .report-body {
      margin-top: 4px;
    }

    .report-body h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #1b4332;
      border-bottom: 1px solid #1b4332;
      padding-bottom: 3px;
      margin: 20px 0 8px;
    }

    .report-body p {
      margin-bottom: 6px;
      text-align: justify;
    }

    .report-body ul {
      margin: 6px 0 10px 20px;
    }

    .report-body li {
      margin-bottom: 3px;
    }

    .report-body em {
      color: #777;
      font-style: italic;
    }

    .report-body strong {
      font-weight: 700;
    }

    /* ── Área de assinatura ── */
    .signature-block {
      margin-top: 40px;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .signature-line {
      width: 260px;
      border-top: 1px solid #1a1a1a;
      padding-top: 6px;
      text-align: center;
      font-size: 9.5pt;
      line-height: 1.4;
    }

    /* ── Rodapé LGPD (fixo no fundo via posição no HTML) ── */
    .lgpd-footer {
      margin-top: 48px;
      border-top: 1px solid #ccc;
      padding-top: 8px;
      font-size: 7.5pt;
      color: #666;
      text-align: center;
      line-height: 1.5;
    }

    /* Evita quebra de página dentro de seções principais */
    h2 + p, h2 + ul { page-break-before: avoid; }
    .patient-block { page-break-inside: avoid; }
  </style>
</head>
<body>
<div class="page-wrapper">

  <!-- Timbre institucional -->
  <header class="letterhead">
    ${logoHtml}
    <div class="clinic-info">
      <div class="clinic-name">${escapeHtml(clinicName)}</div>
      <div class="clinic-details">
        ${clinicCnpj ? `CNPJ: ${escapeHtml(clinicCnpj)}<br/>` : ''}
        ${clinicAddress ? escapeHtml(clinicAddress) : ''}
      </div>
    </div>
    <div class="professional-badge">
      <strong>${escapeHtml(professionalName)}</strong><br/>
      ${escapeHtml(specialty)}<br/>
      Registro: <strong>${escapeHtml(professionalRegistry)}</strong>
    </div>
  </header>

  <!-- Título do documento -->
  <div class="doc-title">
    <h1>Prontuário Clínico — Evolução de Sessão</h1>
    <p>Documento gerado eletronicamente em ${generatedAt} (horário de Brasília)</p>
  </div>

  <!-- Identificação do paciente -->
  <div class="patient-block">
    <div>
      <div class="field-label">Paciente</div>
      <div class="field-value">${escapeHtml(patientName)}</div>
    </div>
    <div>
      <div class="field-label">Data da Sessão</div>
      <div class="field-value">${formattedDate}</div>
    </div>
    <div>
      <div class="field-label">Profissional Responsável</div>
      <div class="field-value">${escapeHtml(professionalName)}</div>
    </div>
    <div>
      <div class="field-label">Registro Profissional</div>
      <div class="field-value">${escapeHtml(professionalRegistry)}</div>
    </div>
  </div>

  <!-- Corpo do relatório gerado pela IA -->
  <article class="report-body">
    ${reportHtml}
  </article>

  <!-- Assinatura -->
  <div class="signature-block">
    <div class="signature-line">
      ${escapeHtml(professionalName)}<br/>
      ${escapeHtml(professionalRegistry)} — ${escapeHtml(specialty)}
    </div>
  </div>

  <!-- Rodapé de conformidade LGPD -->
  <footer class="lgpd-footer">
    Documento gerado eletronicamente pela plataforma Prontua em ${generatedAt}.<br/>
    Em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).<br/>
    Registro profissional: ${escapeHtml(professionalRegistry)} | Clínica: ${escapeHtml(clinicName)}
    ${clinicCnpj ? ` | CNPJ: ${escapeHtml(clinicCnpj)}` : ''}
  </footer>

</div>
</body>
</html>`;
}

/** Escapa caracteres HTML para prevenir XSS no template do PDF. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Gera o PDF clínico oficial como Buffer.
 *
 * @returns Buffer do PDF pronto para envio via HTTP ou upload para S3.
 */
export async function generateClinicalPdf(opts: ClinicalPdfOptions): Promise<Buffer> {
  logger.info({ patientName: '[REDACTED]' }, 'voice_pdf_generation_start');

  const html = buildHtml(opts);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',                   // necessário em Docker/Linux sem root
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',        // evita OOM em containers com /dev/shm pequeno
      '--disable-gpu',
      '--font-render-hinting=none',     // tipografia mais consistente em servidor
    ],
  });

  try {
    const page = await browser.newPage();

    // Aguarda fontes carregarem antes de gerar o PDF
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '28mm', left: '20mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width:100%; text-align:center; font-size:8pt; color:#555; font-family:Georgia,serif; padding:0 20mm;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`,
    });

    logger.info({ sizeBytes: pdf.byteLength }, 'voice_pdf_generation_success');

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
