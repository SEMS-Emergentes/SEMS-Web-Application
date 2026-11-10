import { jsPDF } from "jspdf";

/**
 * Genera el PDF de un comprobante de pago y lo descarga.
 *
 * El backend emite el comprobante (numero, fecha, importe) pero no produce su
 * PDF: el enlace llegaba siempre vacio y el boton de descarga se quedaba gris
 * en todos los pagos, cobrados o no. Se arma aqui con los datos que el backend
 * ya devuelve, igual que el reporte de consumo.
 *
 * @param {{number: string, date: string, amount: number, method: string | null,
 *          userEmail: string, lang: "es" | "en"}} r
 */
export function generateReceipt(r) {
  const es = r.lang === "es";
  const T = (a, b) => (es ? a : b);
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SEMS", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(T("Comprobante de pago", "Payment receipt"), 14, 20);

  const filas = [
    [T("Comprobante", "Receipt"), r.number],
    [T("Fecha", "Date"), r.date],
    [T("Cliente", "Customer"), r.userEmail],
    [T("Medio de pago", "Payment method"), r.method || "—"],
    [T("Estado", "Status"), T("Pagado", "Paid")],
  ];
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  filas.forEach(([k, v], i) => {
    const y = 42 + i * 9;
    doc.setFont("helvetica", "bold");
    doc.text(k, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), 70, y);
  });

  const yTotal = 42 + filas.length * 9 + 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, yTotal - 6, pageW - 14, yTotal - 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Total", 14, yTotal + 2);
  doc.text(`S/ ${Number(r.amount).toFixed(2)}`, pageW - 14, yTotal + 2, { align: "right" });

  // Mientras los cobros sean simulados el documento lo dice: un comprobante
  // sin esa nota podria pasar por uno real.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    T("Pago simulado con fines de demostración. No constituye comprobante tributario.",
      "Simulated payment for demonstration purposes. Not a tax receipt."),
    14, yTotal + 16
  );

  doc.save(`${r.number}.pdf`);
}
