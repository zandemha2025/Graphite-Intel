import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, HeadingLevel, PageBreak, TextRun, convertInchesToTwip, AlignmentType, BorderStyle } from "docx";
import type { Report } from "@workspace/db";

interface ParsedSection {
  type: "title" | "heading" | "text" | "bullet" | "number";
  content: string;
  level?: number; // for headings
}

export class ExportService {
  private parseMarkdown(content: string): ParsedSection[] {
    const lines = content.split("\n");
    const sections: ParsedSection[] = [];
    let currentBulletList: string[] = [];
    let currentNumberList: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Handle title (# Header)
      if (trimmed.startsWith("# ") && sections.length === 0) {
        sections.push({
          type: "title",
          content: trimmed.substring(2),
        });
        continue;
      }

      // Handle headings
      const headingMatch = trimmed.match(/^(#{2,6})\s+(.+)$/);
      if (headingMatch) {
        // Flush any pending lists
        if (currentBulletList.length > 0) {
          sections.push({
            type: "bullet",
            content: currentBulletList.join("\n"),
          });
          currentBulletList = [];
        }
        if (currentNumberList.length > 0) {
          sections.push({
            type: "number",
            content: currentNumberList.join("\n"),
          });
          currentNumberList = [];
        }

        const level = headingMatch[1].length;
        sections.push({
          type: "heading",
          content: headingMatch[2],
          level,
        });
        continue;
      }

      // Handle bullet points
      if (trimmed.startsWith("- ")) {
        if (currentNumberList.length > 0) {
          sections.push({
            type: "number",
            content: currentNumberList.join("\n"),
          });
          currentNumberList = [];
        }
        currentBulletList.push(trimmed.substring(2));
        continue;
      }

      // Handle numbered lists
      const numberMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (numberMatch) {
        if (currentBulletList.length > 0) {
          sections.push({
            type: "bullet",
            content: currentBulletList.join("\n"),
          });
          currentBulletList = [];
        }
        currentNumberList.push(numberMatch[1]);
        continue;
      }

      // Handle regular text
      if (trimmed && !trimmed.startsWith("#")) {
        // Flush pending lists
        if (currentBulletList.length > 0) {
          sections.push({
            type: "bullet",
            content: currentBulletList.join("\n"),
          });
          currentBulletList = [];
        }
        if (currentNumberList.length > 0) {
          sections.push({
            type: "number",
            content: currentNumberList.join("\n"),
          });
          currentNumberList = [];
        }

        sections.push({
          type: "text",
          content: trimmed,
        });
      }
    }

    // Flush remaining lists
    if (currentBulletList.length > 0) {
      sections.push({
        type: "bullet",
        content: currentBulletList.join("\n"),
      });
    }
    if (currentNumberList.length > 0) {
      sections.push({
        type: "number",
        content: currentNumberList.join("\n"),
      });
    }

    return sections;
  }

  async generatePDF(report: Report): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      const doc = new PDFDocument({
        size: "letter",
        margin: 50,
        bufferPages: true,
      });

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;
      const contentWidth = pageWidth - 2 * margin;

      // Cover page
      doc.fontSize(28).font("Helvetica-Bold");
      const titleY = pageHeight / 3;
      doc.text(report.title, margin, titleY, {
        width: contentWidth,
        align: "center",
      });

      doc.fontSize(14).font("Helvetica");
      let y = titleY + 80;
      doc.text(`${report.company}`, margin, y, {
        width: contentWidth,
        align: "center",
      });

      y += 40;
      doc.text(`${new Date(report.createdAt).toLocaleDateString()}`, margin, y, {
        width: contentWidth,
        align: "center",
      });

      // Add page number on cover
      doc.fontSize(10).text("1", margin, pageHeight - 40, {
        width: contentWidth,
        align: "center",
      });

      // Parse content
      const sections = this.parseMarkdown(report.content || "");

      // Table of Contents
      doc.addPage();
      doc.fontSize(16).font("Helvetica-Bold").text("Table of Contents", margin, 50);
      doc.fontSize(11).font("Helvetica");

      let tocY = 90;
      const headingSections = sections.filter((s) => s.type === "heading");
      for (const section of headingSections) {
        doc.text(`• ${section.content}`, margin + 20, tocY);
        tocY += 20;
      }

      // Add TOC page number
      doc.fontSize(10).text("2", margin, pageHeight - 40, {
        width: contentWidth,
        align: "center",
      });

      // Content pages
      let pageNumber = 3;

      for (const section of sections) {
        if (section.type === "title") {
          // Skip title as it's on cover page
          continue;
        }

        if (section.type === "heading") {
          // Check if we need a new page
          if (doc.y > pageHeight - 100) {
            doc.addPage();
            pageNumber++;
          }

          const headingSize = section.level === 2 ? 14 : 12;
          doc.fontSize(headingSize).font("Helvetica-Bold").text(section.content, margin, doc.y + 12);
          doc.moveDown(0.5);
          continue;
        }

        if (section.type === "text") {
          if (doc.y > pageHeight - 80) {
            doc.addPage();
            pageNumber++;
          }

          doc.fontSize(11).font("Helvetica").text(section.content, margin, doc.y, {
            width: contentWidth,
            align: "left",
          });
          doc.moveDown(0.5);
          continue;
        }

        if (section.type === "bullet") {
          if (doc.y > pageHeight - 80) {
            doc.addPage();
            pageNumber++;
          }

          const bullets = section.content.split("\n");
          for (const bullet of bullets) {
            doc.fontSize(11).font("Helvetica");
            doc.text(`• ${bullet}`, margin + 20, doc.y, {
              width: contentWidth - 20,
            });
          }
          doc.moveDown(0.3);
          continue;
        }

        if (section.type === "number") {
          if (doc.y > pageHeight - 80) {
            doc.addPage();
            pageNumber++;
          }

          const numbers = section.content.split("\n");
          for (let i = 0; i < numbers.length; i++) {
            doc.fontSize(11).font("Helvetica");
            doc.text(`${i + 1}. ${numbers[i]}`, margin + 20, doc.y, {
              width: contentWidth - 20,
            });
          }
          doc.moveDown(0.3);
          continue;
        }
      }

      // Add page numbers to all pages
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 1; i <= pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(10).font("Helvetica").text(String(i), margin, pageHeight - 30, {
          width: contentWidth,
          align: "center",
        });
      }

      doc.end();
    });
  }

  async generateDocx(report: Report): Promise<Buffer> {
    const sections = this.parseMarkdown(report.content || "");
    const docSections: Paragraph[] = [];

    // Title
    docSections.push(
      new Paragraph({
        text: report.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        thematicBreak: false,
      })
    );

    // Subtitle with company and date
    docSections.push(
      new Paragraph({
        text: `${report.company} | ${new Date(report.createdAt).toLocaleDateString()}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Table of Contents
    const headings = sections.filter((s) => s.type === "heading");
    if (headings.length > 0) {
      docSections.push(
        new Paragraph({
          text: "Table of Contents",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200 },
        })
      );

      for (const heading of headings) {
        docSections.push(
          new Paragraph({
            text: heading.content,
            spacing: { before: 100, after: 100 },
            indent: { left: 720 },
          })
        );
      }

      docSections.push(
        new Paragraph({
          text: "",
          spacing: { after: 400 },
        })
      );
    }

    // Content
    for (const section of sections) {
      if (section.type === "title") {
        continue; // Already added as main heading
      }

      if (section.type === "heading") {
        const level = Math.min(section.level || 2, 5);
        const headingLevel = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5][level - 1] || HeadingLevel.HEADING_2;

        docSections.push(
          new Paragraph({
            text: section.content,
            heading: headingLevel,
            spacing: { before: 200, after: 100 },
          })
        );
        continue;
      }

      if (section.type === "text") {
        docSections.push(
          new Paragraph({
            text: section.content,
            spacing: { after: 200, line: 360 },
          })
        );
        continue;
      }

      if (section.type === "bullet") {
        const bullets = section.content.split("\n");
        for (const bullet of bullets) {
          docSections.push(
            new Paragraph({
              text: bullet,
              bullet: { level: 0 },
              spacing: { after: 100 },
            })
          );
        }
        continue;
      }

      if (section.type === "number") {
        const numbers = section.content.split("\n");
        for (let i = 0; i < numbers.length; i++) {
          docSections.push(
            new Paragraph({
              text: numbers[i],
              numbering: {
                level: 0,
                reference: `numbered-list`,
              },
              spacing: { after: 100 },
            })
          );
        }
        continue;
      }
    }

    // Footer
    const doc = new Document({
      sections: [
        {
          children: docSections,
          footers: {
            default: {
              options: {
                children: [
                  new Paragraph({
                    text: `${report.company} | ${new Date(report.createdAt).toLocaleDateString()}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 100 },
                    border: {
                      top: {
                        color: "CCCCCC",
                        space: 1,
                        style: BorderStyle.SINGLE,
                        size: 6,
                      },
                    },
                  }),
                ],
              },
            },
          },
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }
}
