import { PDFDocument } from "pdf-lib";

const TEMPLATE_CONFIG = {
  Basic: {
    file: "basic.pdf",
    dateCenterX: 0.289,
    dateCenterY: 0.316,
  },

  Standart: {
    file: "standard.pdf",
    dateCenterX: 0.287,
    dateCenterY: 0.318,
  },

  Expert: {
    file: "expert.pdf",
    dateCenterX: 0.278,
    dateCenterY: 0.32,
  },
};

function getCertificateLevel(score) {
  if (!Number.isFinite(score) || score < 60 || score > 100) {
    return null;
  }

  if (score < 74) return "Basic";
  if (score < 88) return "Standart";

  return "Expert";
}

function getPublicPath(fileName) {
  const base = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");

  return `${base}/certificates/${fileName}`;
}

function formatCertificateDate(value) {
  if (!value) {
    throw new Error("Sertifikat berilgan sana topilmadi.");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Sertifikat sanasi noto‘g‘ri.");
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value || "";

  return [
    getPart("day"),
    getPart("month"),
    getPart("year"),
  ].join(".");
}

async function loadTemplate(fileName) {
  const response = await fetch(getPublicPath(fileName));

  if (!response.ok) {
    throw new Error(
      `Sertifikat shabloni topilmadi: public/certificates/${fileName}`
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  const signature = new TextDecoder("ascii").decode(
    bytes.slice(0, 5)
  );

  if (signature !== "%PDF-") {
    throw new Error(
      `${fileName} PDF fayli emas yoki noto‘g‘ri joylashtirilgan. ` +
        "public/certificates papkasini tekshiring."
    );
  }

  return bytes;
}

function createTextImage(text, bold = false) {
  const value = String(text)
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) {
    throw new Error("Sertifikatga yoziladigan matn bo‘sh.");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Brauzer sertifikat yozuvlarini yaratishni qo‘llab-quvvatlamaydi."
    );
  }

  let sourceFontSize = 120;

  const setFont = () => {
    context.font =
      `${bold ? "700" : "400"} ${sourceFontSize}px Arial, sans-serif`;
  };

  setFont();

  const measured = context.measureText(value).width;

  if (measured > 6000) {
    sourceFontSize = Math.max(
      12,
      Math.floor((sourceFontSize * 6000) / measured)
    );

    setFont();
  }

  const padding = Math.ceil(sourceFontSize * 0.25);

  canvas.width = Math.ceil(
    context.measureText(value).width + padding * 2
  );

  canvas.height = Math.ceil(sourceFontSize * 1.6);

  setFont();

  context.clearRect(0, 0, canvas.width, canvas.height);

  // Sertifikatga qo‘shiladigan barcha yozuvlar qora.
  context.fillStyle = "#000000";
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillText(
    value,
    canvas.width / 2,
    canvas.height / 2
  );

  return {
    dataUrl: canvas.toDataURL("image/png"),
    sourceFontSize,
  };
}

async function drawTextImage(
  pdf,
  page,
  text,
  {
    centerX,
    rightX,
    centerY,
    fontSize,
    maxWidth,
    bold = false,
  }
) {
  const rendered = createTextImage(text, bold);
  const image = await pdf.embedPng(rendered.dataUrl);

  let scale = fontSize / rendered.sourceFontSize;

  // Uzun familiya-ism shablon chegarasidan chiqmaydi.
  if (image.width * scale > maxWidth) {
    scale = maxWidth / image.width;
  }

  const width = image.width * scale;
  const height = image.height * scale;

  const x = Number.isFinite(rightX)
    ? rightX - width
    : centerX - width / 2;

  page.drawImage(image, {
    x,
    y: centerY - height / 2,
    width,
    height,
  });
}

export async function createCertificatePdf(certificate) {
  if (!certificate) {
    throw new Error("Sertifikat ma’lumotlari topilmadi.");
  }

  const id = String(certificate.id || "").trim();

  const name = String(certificate.name || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!id) {
    throw new Error("Sertifikat ID raqami topilmadi.");
  }

  if (!name) {
    throw new Error(
      "Talabaning familiyasi va ismi kiritilmagan."
    );
  }

  if (
    certificate.score === null ||
    certificate.score === undefined ||
    certificate.score === ""
  ) {
    throw new Error("Yakuniy test bali topilmadi.");
  }

  const score = Number(certificate.score);
  const level = getCertificateLevel(score);

  if (!level) {
    throw new Error(
      "Sertifikat olish uchun o‘rtacha test bali 60–100 oralig‘ida bo‘lishi kerak."
    );
  }

  const config = TEMPLATE_CONFIG[level];
  const date = formatCertificateDate(certificate.createdAt);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const template = await loadTemplate(config.file);
  const pdf = await PDFDocument.load(template);

  if (pdf.getPageCount() !== 1) {
    throw new Error(
      "Sertifikat shabloni bitta sahifadan iborat bo‘lishi kerak."
    );
  }

  const page = pdf.getPages()[0];
  const { width, height } = page.getSize();

  // Familiya va ism: oldingi 25 o‘rniga 32.
  await drawTextImage(pdf, page, name, {
    centerX: width * 0.5,
    centerY: height * 0.503,
    fontSize: 32,
    maxWidth: width * 0.69,
    bold: true,
  });

  // Sana: oldingi 11 o‘rniga 14.
  await drawTextImage(pdf, page, date, {
    centerX: width * config.dateCenterX,
    centerY: height * config.dateCenterY,
    fontSize: 14,
    maxWidth: width * 0.17,
    bold: true,
  });

  // ID: oldingi 10 o‘rniga 13.
  await drawTextImage(pdf, page, `ID: ${id}`, {
    rightX: width * 0.91,
    centerY: height * 0.915,
    fontSize: 13,
    maxWidth: width * 0.32,
    bold: true,
  });

  pdf.setTitle(`${level} — ${name}`);
  pdf.setSubject(`Sertifikat ID: ${id}`);
  pdf.setAuthor("IT TAT");
  pdf.setCreator("IT TAT o‘quv platformasi");

  return pdf.save();
}

export async function downloadCertificate(certificate) {
  const bytes = await createCertificatePdf(certificate);

  const blob = new Blob([bytes], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);

  const safeId = String(certificate.id).replace(
    /[\\/:*?"<>|]/g,
    "-"
  );

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `IT-TAT-sertifikat-${safeId}.pdf`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}