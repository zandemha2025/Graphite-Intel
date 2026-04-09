import { Router, type IRouter, type Request, type Response } from "express";
import { ExportService } from "../lib/exportService.js";

const router: IRouter = Router();
const exportService = new ExportService();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/* ---------- POST /api/exports/pdf ---------- */

router.post("/exports/pdf", (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { content, title } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const safeTitle = (title || "Stratix Export").replace(/[^a-z0-9 ]/gi, "").trim();

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>
  @page { size: letter; margin: 1in; }
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1918; line-height: 1.6; }
  h1, h2, h3 { font-family: 'Source Serif 4', Georgia, serif; }
  h1 { font-size: 28px; border-bottom: 2px solid #B85C38; padding-bottom: 8px; margin-bottom: 24px; }
  h2 { font-size: 22px; margin-top: 32px; }
  h3 { font-size: 18px; margin-top: 24px; }
  p { margin-bottom: 12px; }
  pre { background: #f5f0e8; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
  code { font-family: 'SF Mono', 'Menlo', monospace; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f0e8; font-weight: bold; }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  blockquote { border-left: 3px solid #B85C38; margin: 16px 0; padding: 8px 16px; color: #555; }
  @media print { body { margin: 0; max-width: none; } }
</style></head>
<body>
<h1>${safeTitle}</h1>
${content}
</body></html>`;

  const filename = safeTitle.replace(/\s+/g, "_").substring(0, 100);

  res.setHeader("Content-Type", "text/html");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.html"`,
  );
  res.send(html);
});

export default router;
