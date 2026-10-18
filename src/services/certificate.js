import { jsPDF } from "jspdf";
export async function downloadCertificate(cert) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 1273;
  const ctx = canvas.getContext("2d");
  const style = getComputedStyle(document.documentElement),
    primary = style.getPropertyValue("--primary").trim(),
    bg = style.getPropertyValue("--surface").trim(),
    text = style.getPropertyValue("--text").trim();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1800, 1273);
  ctx.strokeStyle = primary;
  ctx.lineWidth = 8;
  ctx.strokeRect(50, 50, 1700, 1173);
  ctx.lineWidth = 2;
  ctx.strokeRect(75, 75, 1650, 1123);
  ctx.textAlign = "center";
  const size = key => parseFloat(style.getPropertyValue("--cert-fs-" + key));
  function line(value, y, size, color = text) {
    ctx.fillStyle = color;
    ctx.font = `600 ${size}px Arial`;
    ctx.fillText(value, 900, y, 1550);
  }
  line("AI ACADEMY", 180, size("brand"), primary);
  line("SERTIFIKAT", 330, size("title"), primary);
  line("Kursni muvaffaqiyatli yakunlaganlik uchun", 410, size("subtitle"));
  line(cert.name, 570, size("name"));
  line(cert.title, 675, size("course"));
  line(`Yakuniy test bahosi: ${cert.score.toFixed(2)}%`, 790, size("score"));
  line(`${cert.lessonCount} ta dars · video, test va amaliy ishlar yakunlangan`, 865, size("body"));
  line(new Date(cert.createdAt).toLocaleDateString("uz-UZ"), 1010, size("date"));
  line(`ID: ${cert.id}`, 1090, size("id"));
  line("AI Academy o‘quv platformasi", 1140, size("footer"));
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210);
  pdf.save("AI-Academy-sertifikat-" + cert.id.slice(0, 8) + ".pdf");
}
