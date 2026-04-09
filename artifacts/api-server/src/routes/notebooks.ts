/**
 * Notebook endpoints — multi-cell analytical workspaces with AI execution.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, notebooks, notebookCells, companyProfiles } from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Cell reference resolution: {{cell.1}} or {{cell.Some Title}}
// ---------------------------------------------------------------------------

function resolveCellReferences(
  prompt: string,
  cells: { cellIndex: number; title: string; output: string | null }[],
): string {
  return prompt.replace(/\{\{cell\.([^}]+)\}\}/g, (_match, ref: string) => {
    const asIndex = parseInt(ref, 10);
    const cell = !isNaN(asIndex)
      ? cells.find((c) => c.cellIndex === asIndex)
      : cells.find((c) => c.title.toLowerCase() === ref.toLowerCase());
    return cell?.output ?? `[cell "${ref}" has no output yet]`;
  });
}

// ---------------------------------------------------------------------------
// Build system prompt for cell execution
// ---------------------------------------------------------------------------

const CELL_SYSTEM_PROMPT = `You are Stratix, an elite AI strategic advisor. You are executing a cell within an analytical notebook.

Provide clear, structured, data-driven analysis. Use markdown formatting with headers, bullet points, and bold text for key findings. Be specific and actionable.`;

async function buildCellContext(
  req: Request,
  cell: { prompt: string; title: string; dataSourceHint: string | null },
  previousCells: { cellIndex: number; title: string; output: string | null }[],
): Promise<string> {
  const orgId = req.user!.orgId;
  let context = CELL_SYSTEM_PROMPT;

  // Add company profile context
  if (orgId) {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.orgId, orgId));

    if (profile) {
      context += `\n\nCLIENT CONTEXT:
- Company: ${profile.companyName}
- Industry: ${profile.industry}
- Stage: ${profile.stage}
- Revenue: ${profile.revenueRange}
${profile.competitors ? `- Competitors: ${profile.competitors}` : ""}
${profile.strategicPriorities ? `- Priorities: ${profile.strategicPriorities}` : ""}`;
    }
  }

  // Add previous cells' output as context
  const cellsWithOutput = previousCells.filter((c) => c.output);
  if (cellsWithOutput.length > 0) {
    context += "\n\nPREVIOUS CELLS IN THIS NOTEBOOK:";
    for (const c of cellsWithOutput) {
      context += `\n\n--- Cell ${c.cellIndex}: "${c.title}" ---\n${c.output}\n--- End ---`;
    }
  }

  if (cell.dataSourceHint) {
    context += `\n\nDATA SOURCE HINT: Focus on data that would come from ${cell.dataSourceHint}. Tailor your analysis to this data source.`;
  }

  return context;
}

// ---------------------------------------------------------------------------
// GET /notebooks — list notebooks for org
// ---------------------------------------------------------------------------

router.get("/notebooks", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const rows = await db
      .select()
      .from(notebooks)
      .where(eq(notebooks.orgId, orgId))
      .orderBy(desc(notebooks.updatedAt));

    // Attach cell counts
    const withCounts = await Promise.all(
      rows.map(async (nb) => {
        const [count] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(notebookCells)
          .where(eq(notebookCells.notebookId, nb.id));
        return { ...nb, cellCount: count?.count ?? 0 };
      }),
    );

    res.json(withCounts);
  } catch (err) {
    req.log.error({ err }, "Failed to list notebooks");
    res.status(500).json({ error: "Failed to list notebooks" });
  }
});

// ---------------------------------------------------------------------------
// POST /notebooks — create notebook
// ---------------------------------------------------------------------------

router.post("/notebooks", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { title, description } = req.body;
    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const [notebook] = await db
      .insert(notebooks)
      .values({
        orgId,
        createdByUserId: String(userId),
        title,
        description: description ?? null,
      })
      .returning();

    res.status(201).json(notebook);
  } catch (err) {
    req.log.error({ err }, "Failed to create notebook");
    res.status(500).json({ error: "Failed to create notebook" });
  }
});

// ---------------------------------------------------------------------------
// GET /notebooks/:id — get notebook with cells
// ---------------------------------------------------------------------------

router.get("/notebooks/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notebook id" });
    return;
  }

  try {
    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, id), eq(notebooks.orgId, orgId)));

    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const cells = await db
      .select()
      .from(notebookCells)
      .where(eq(notebookCells.notebookId, id))
      .orderBy(asc(notebookCells.cellIndex));

    res.json({ ...notebook, cells });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch notebook");
    res.status(500).json({ error: "Failed to fetch notebook" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /notebooks/:id — update metadata
// ---------------------------------------------------------------------------

router.patch("/notebooks/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notebook id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, id), eq(notebooks.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const { title, description, refreshSchedule } = req.body;

    const [updated] = await db
      .update(notebooks)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(refreshSchedule !== undefined && { refreshSchedule }),
      })
      .where(eq(notebooks.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update notebook");
    res.status(500).json({ error: "Failed to update notebook" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /notebooks/:id — delete notebook + cells (cascade)
// ---------------------------------------------------------------------------

router.delete("/notebooks/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notebook id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, id), eq(notebooks.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    await db.delete(notebooks).where(eq(notebooks.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete notebook");
    res.status(500).json({ error: "Failed to delete notebook" });
  }
});

// ---------------------------------------------------------------------------
// POST /notebooks/:id/cells — add cell
// ---------------------------------------------------------------------------

router.post("/notebooks/:id/cells", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notebook id" });
    return;
  }

  try {
    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, id), eq(notebooks.orgId, orgId)));

    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const { prompt, title, dataSourceHint, cellIndex } = req.body;
    if (!prompt || !title) {
      res.status(400).json({ error: "prompt and title are required" });
      return;
    }

    // If cellIndex not specified, append at end
    let index = cellIndex;
    if (index === undefined || index === null) {
      const [maxRow] = await db
        .select({ max: sql<number>`coalesce(max(cell_index), -1)::int` })
        .from(notebookCells)
        .where(eq(notebookCells.notebookId, id));
      index = (maxRow?.max ?? -1) + 1;
    }

    const [cell] = await db
      .insert(notebookCells)
      .values({
        notebookId: id,
        cellIndex: index,
        title,
        prompt,
        dataSourceHint: dataSourceHint ?? null,
      })
      .returning();

    res.status(201).json(cell);
  } catch (err) {
    req.log.error({ err }, "Failed to add cell");
    res.status(500).json({ error: "Failed to add cell" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /notebooks/:id/cells/:cellId — update cell
// ---------------------------------------------------------------------------

router.patch("/notebooks/:id/cells/:cellId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const notebookId = parseInt(req.params.id as string);
  const cellId = parseInt(req.params.cellId as string);

  if (isNaN(notebookId) || isNaN(cellId)) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  try {
    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, notebookId), eq(notebooks.orgId, orgId)));

    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const { prompt, title, cellIndex, dataSourceHint } = req.body;

    const [updated] = await db
      .update(notebookCells)
      .set({
        ...(prompt !== undefined && { prompt }),
        ...(title !== undefined && { title }),
        ...(cellIndex !== undefined && { cellIndex }),
        ...(dataSourceHint !== undefined && { dataSourceHint }),
      })
      .where(and(eq(notebookCells.id, cellId), eq(notebookCells.notebookId, notebookId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Cell not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update cell");
    res.status(500).json({ error: "Failed to update cell" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /notebooks/:id/cells/:cellId — delete cell and reindex
// ---------------------------------------------------------------------------

router.delete("/notebooks/:id/cells/:cellId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const notebookId = parseInt(req.params.id as string);
  const cellId = parseInt(req.params.cellId as string);

  if (isNaN(notebookId) || isNaN(cellId)) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  try {
    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, notebookId), eq(notebooks.orgId, orgId)));

    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const [deleted] = await db
      .delete(notebookCells)
      .where(and(eq(notebookCells.id, cellId), eq(notebookCells.notebookId, notebookId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Cell not found" });
      return;
    }

    // Reindex remaining cells
    const remaining = await db
      .select()
      .from(notebookCells)
      .where(eq(notebookCells.notebookId, notebookId))
      .orderBy(asc(notebookCells.cellIndex));

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].cellIndex !== i) {
        await db
          .update(notebookCells)
          .set({ cellIndex: i })
          .where(eq(notebookCells.id, remaining[i].id));
      }
    }

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete cell");
    res.status(500).json({ error: "Failed to delete cell" });
  }
});

// ---------------------------------------------------------------------------
// POST /notebooks/:id/cells/:cellId/execute — execute single cell via SSE
// ---------------------------------------------------------------------------

router.post("/notebooks/:id/cells/:cellId/execute", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const notebookId = parseInt(req.params.id as string);
  const cellId = parseInt(req.params.cellId as string);

  if (isNaN(notebookId) || isNaN(cellId)) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  try {
    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, notebookId), eq(notebooks.orgId, orgId)));

    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const allCells = await db
      .select()
      .from(notebookCells)
      .where(eq(notebookCells.notebookId, notebookId))
      .orderBy(asc(notebookCells.cellIndex));

    const cell = allCells.find((c) => c.id === cellId);
    if (!cell) {
      res.status(404).json({ error: "Cell not found" });
      return;
    }

    // SSE setup
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Mark cell as running
    await db
      .update(notebookCells)
      .set({ status: "running", output: null })
      .where(eq(notebookCells.id, cellId));

    sendEvent("cell_start", { cellId, cellIndex: cell.cellIndex, title: cell.title });

    // Build context from previous cells
    const previousCells = allCells
      .filter((c) => c.cellIndex < cell.cellIndex)
      .map((c) => ({ cellIndex: c.cellIndex, title: c.title, output: c.output }));

    const resolvedPrompt = resolveCellReferences(cell.prompt, previousCells);
    const systemPrompt = await buildCellContext(req, cell, previousCells);

    let fullResponse = "";
    let totalTokens = 0;

    try {
      const stream = await (getOpenAIClient() as any).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: resolvedPrompt },
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.5,
      });

      for await (const chunk of stream as any) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          sendEvent("cell_content", { cellId, delta });
        }
        if (chunk.usage?.total_tokens) {
          totalTokens = chunk.usage.total_tokens;
        }
      }

      await db
        .update(notebookCells)
        .set({
          status: "complete",
          output: fullResponse,
          lastExecutedAt: new Date(),
          tokensCost: totalTokens || null,
        })
        .where(eq(notebookCells.id, cellId));

      sendEvent("cell_complete", { cellId, cellIndex: cell.cellIndex });
    } catch (execErr) {
      await db
        .update(notebookCells)
        .set({ status: "failed" })
        .where(eq(notebookCells.id, cellId));

      sendEvent("cell_error", { cellId, error: "Cell execution failed" });
    }

    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to execute cell");
    res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to execute cell" })}\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /notebooks/:id/execute — execute ALL cells sequentially via SSE
// ---------------------------------------------------------------------------

router.post("/notebooks/:id/execute", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const notebookId = parseInt(req.params.id as string);

  if (isNaN(notebookId)) {
    res.status(400).json({ error: "Invalid notebook id" });
    return;
  }

  try {
    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, notebookId), eq(notebooks.orgId, orgId)));

    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const cells = await db
      .select()
      .from(notebookCells)
      .where(eq(notebookCells.notebookId, notebookId))
      .orderBy(asc(notebookCells.cellIndex));

    if (cells.length === 0) {
      res.status(400).json({ error: "Notebook has no cells" });
      return;
    }

    // SSE setup
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent("notebook_start", { notebookId, totalCells: cells.length });

    // Execute cells sequentially — each cell gets previous output as context
    const executedCells: { cellIndex: number; title: string; output: string | null }[] = [];

    for (const cell of cells) {
      await db
        .update(notebookCells)
        .set({ status: "running", output: null })
        .where(eq(notebookCells.id, cell.id));

      sendEvent("cell_start", { cellId: cell.id, cellIndex: cell.cellIndex, title: cell.title });

      const resolvedPrompt = resolveCellReferences(cell.prompt, executedCells);
      const systemPrompt = await buildCellContext(req, cell, executedCells);

      let fullResponse = "";
      let totalTokens = 0;

      try {
        const stream = await (getOpenAIClient() as any).chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: resolvedPrompt },
          ],
          stream: true,
          max_tokens: 4096,
          temperature: 0.5,
        });

        for await (const chunk of stream as any) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            fullResponse += delta;
            sendEvent("cell_content", { cellId: cell.id, delta });
          }
          if (chunk.usage?.total_tokens) {
            totalTokens = chunk.usage.total_tokens;
          }
        }

        await db
          .update(notebookCells)
          .set({
            status: "complete",
            output: fullResponse,
            lastExecutedAt: new Date(),
            tokensCost: totalTokens || null,
          })
          .where(eq(notebookCells.id, cell.id));

        executedCells.push({
          cellIndex: cell.cellIndex,
          title: cell.title,
          output: fullResponse,
        });

        sendEvent("cell_complete", { cellId: cell.id, cellIndex: cell.cellIndex });
      } catch (execErr) {
        await db
          .update(notebookCells)
          .set({ status: "failed" })
          .where(eq(notebookCells.id, cell.id));

        executedCells.push({ cellIndex: cell.cellIndex, title: cell.title, output: null });
        sendEvent("cell_error", { cellId: cell.id, error: "Cell execution failed" });
      }
    }

    // Update notebook lastRefreshedAt
    await db
      .update(notebooks)
      .set({ lastRefreshedAt: new Date() })
      .where(eq(notebooks.id, notebookId));

    sendEvent("notebook_complete", { notebookId });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to execute notebook");
    res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to execute notebook" })}\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------------
// POST /notebooks/:id/cells/:cellId/generate -- AI-generate content for a cell
// ---------------------------------------------------------------------------

router.post("/notebooks/:id/cells/:cellId/generate", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const notebookId = parseInt(req.params.id as string);
  const cellId = parseInt(req.params.cellId as string);

  if (isNaN(notebookId) || isNaN(cellId)) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  try {
    const [notebook] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, notebookId), eq(notebooks.orgId, orgId)));

    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const [cell] = await db
      .select()
      .from(notebookCells)
      .where(and(eq(notebookCells.id, cellId), eq(notebookCells.notebookId, notebookId)));

    if (!cell) {
      res.status(404).json({ error: "Cell not found" });
      return;
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const completion = await (getOpenAIClient() as any).chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a code and content generator for an analytical notebook cell. Return clean, well-structured code or analysis based on the user prompt. If generating code, include the language in your response. Format your response as JSON with fields: code (string) and language (string, e.g. python, sql, markdown).",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { code?: string; language?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { code: raw, language: "markdown" };
    }

    res.json({
      code: parsed.code ?? "",
      language: parsed.language ?? "markdown",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate cell content");
    res.status(500).json({ error: "Failed to generate cell content" });
  }
});

// ---------------------------------------------------------------------------
// POST /notebooks/:id/publish -- toggle isPublished
// ---------------------------------------------------------------------------

router.post("/notebooks/:id/publish", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notebook id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(notebooks)
      .where(and(eq(notebooks.id, id), eq(notebooks.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }

    const [updated] = await db
      .update(notebooks)
      .set({ isPublished: !existing.isPublished })
      .where(eq(notebooks.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to toggle publish");
    res.status(500).json({ error: "Failed to toggle publish" });
  }
});

export default router;
