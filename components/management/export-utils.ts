import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

/**
 * Export a DOM element as PNG image
 */
export async function exportAsPNG(element: HTMLElement, filename: string) {
  try {
    // Scroll to top to ensure full capture
    window.scrollTo(0, 0);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Ensure cloned element is visible and styled correctly
        const clonedElement = clonedDoc.getElementById(element.id);
        if (clonedElement) {
          clonedElement.style.display = 'block';
          clonedElement.style.position = 'relative';
          // Remove any export buttons from the clone
          const exportButtons = clonedElement.querySelectorAll('.no-print');
          exportButtons.forEach(btn => {
            (btn as HTMLElement).style.display = 'none';
          });
        }
      }
    });

    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("Error exporting PNG:", error);
    throw new Error("Failed to export as PNG");
  }
}

/**
 * Export a DOM element as PDF
 */
export async function exportAsPDF(element: HTMLElement, filename: string) {
  try {
    // Scroll to top to ensure full capture
    window.scrollTo(0, 0);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Ensure cloned element is visible and styled correctly
        const clonedElement = clonedDoc.getElementById(element.id);
        if (clonedElement) {
          clonedElement.style.display = 'block';
          clonedElement.style.position = 'relative';
          // Remove any export buttons from the clone
          const exportButtons = clonedElement.querySelectorAll('.no-print');
          exportButtons.forEach(btn => {
            (btn as HTMLElement).style.display = 'none';
          });
        }
      }
    });

    const imgData = canvas.toDataURL("image/png");

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;

    // Calculate image dimensions in mm
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;

    // Determine orientation
    const orientation = ratio > 1 ? "landscape" : "portrait";

    // Page dimensions based on orientation
    const pageWidth = orientation === "landscape" ? a4Height : a4Width;
    const pageHeight = orientation === "landscape" ? a4Width : a4Height;

    // Calculate scaled dimensions to fit page with margins
    const margin = 10; // 10mm margin
    const maxWidth = pageWidth - (2 * margin);
    const maxHeight = pageHeight - (2 * margin);

    let finalWidth = maxWidth;
    let finalHeight = maxWidth / ratio;

    // If height exceeds page, scale by height instead
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = maxHeight * ratio;
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
    });

    // Center the image on the page
    const xOffset = (pageWidth - finalWidth) / 2;
    const yOffset = (pageHeight - finalHeight) / 2;

    pdf.addImage(imgData, "PNG", xOffset, yOffset, finalWidth, finalHeight);

    // Add timestamp footer
    const timestamp = new Date().toLocaleString();
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Generated: ${timestamp}`, margin, pageHeight - 5);

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    throw new Error("Failed to export as PDF");
  }
}

/**
 * Export data as Excel file
 */
export function exportAsExcel(data: any[], filename: string, sheetName: string = "Data") {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    throw new Error("Failed to export as Excel");
  }
}

/**
 * Export data as CSV file
 */
export function exportAsCSV(data: any[], filename: string) {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  } catch (error) {
    console.error("Error exporting CSV:", error);
    throw new Error("Failed to export as CSV");
  }
}

/**
 * Generate full dashboard PDF report
 */
export async function generateDashboardReport(sections: Array<{ element: HTMLElement; title: string }>) {
  try {
    // Scroll to top
    window.scrollTo(0, 0);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 15;
    const maxWidth = pageWidth - (2 * margin);
    const maxHeight = pageHeight - 40; // Leave space for header and footer

    let isFirstPage = true;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      if (!isFirstPage) {
        pdf.addPage();
      }

      // Add section title
      pdf.setFontSize(16);
      pdf.setTextColor(34, 71, 148); // Brand color
      pdf.text(section.title, margin, 20);

      // Add page number
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(`Page ${i + 1} of ${sections.length}`, pageWidth - margin - 30, 20);

      // Capture section as image with better options
      const canvas = await html2canvas(section.element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: section.element.scrollWidth,
        windowHeight: section.element.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(section.element.id);
          if (clonedElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.position = 'relative';
            // Remove export buttons
            const exportButtons = clonedElement.querySelectorAll('.no-print');
            exportButtons.forEach(btn => {
              (btn as HTMLElement).style.display = 'none';
            });
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");

      // Calculate dimensions to fit page
      const ratio = canvas.width / canvas.height;
      let imgWidth = maxWidth;
      let imgHeight = imgWidth / ratio;

      // If too tall, scale by height
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * ratio;
      }

      // Center horizontally
      const xOffset = (pageWidth - imgWidth) / 2;

      pdf.addImage(imgData, "PNG", xOffset, 30, imgWidth, imgHeight);

      // Add footer with timestamp
      const timestamp = new Date().toLocaleString();
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`Generated: ${timestamp}`, margin, pageHeight - 10);

      isFirstPage = false;
    }

    const dateStr = new Date().toISOString().split("T")[0];
    pdf.save(`management-dashboard-report-${dateStr}.pdf`);
  } catch (error) {
    console.error("Error generating dashboard report:", error);
    throw new Error("Failed to generate dashboard report");
  }
}

/**
 * Copy data to clipboard as formatted text
 */
export async function copyToClipboard(data: any[], format: "table" | "json" = "table") {
  try {
    let text: string;

    if (format === "json") {
      text = JSON.stringify(data, null, 2);
    } else {
      // Format as tab-separated table
      if (data.length === 0) {
        throw new Error("No data to copy");
      }

      const headers = Object.keys(data[0]);
      const rows = data.map(item => headers.map(key => item[key] || "").join("\t"));
      text = [headers.join("\t"), ...rows].join("\n");
    }

    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    throw new Error("Failed to copy to clipboard");
  }
}

/**
 * Print the entire dashboard
 * Opens browser print dialog with print-optimized styles
 */
export function printDashboard() {
  try {
    window.print();
  } catch (error) {
    console.error("Error printing dashboard:", error);
    throw new Error("Failed to print dashboard");
  }
}

/**
 * Print a specific section
 * Temporarily hides other content and prints the selected section
 */
export function printSection(sectionId: string) {
  try {
    const section = document.getElementById(sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    // Create a new window for printing the section
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Could not open print window");
    }

    // Clone section content
    const sectionClone = section.cloneNode(true) as HTMLElement;

    // Build print HTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print - ${section.getAttribute("data-section-title") || "Dashboard Section"}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 20px;
              background: white;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${sectionClone.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  } catch (error) {
    console.error("Error printing section:", error);
    throw new Error("Failed to print section");
  }
}
