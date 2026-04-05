/**
 * Type-specific configuration forms for workflow step types.
 * Each step type (prompt, tool, data_pull, action, branch, loop, human_review)
 * has its own config form that renders inside the step editor.
 */

interface StepConfig {
  [key: string]: any;
}

interface StepConfigFormProps {
  config: StepConfig;
  onChange: (config: StepConfig) => void;
}

const inputStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid var(--workspace-border)",
  color: "var(--workspace-fg)",
};

const labelStyle: React.CSSProperties = {
  color: "var(--workspace-muted)",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="text-xs uppercase tracking-widest mb-1.5 block"
      style={labelStyle}
    >
      {children}
    </label>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] mt-1" style={{ color: "var(--workspace-muted)", opacity: 0.7 }}>
      {children}
    </p>
  );
}

// ─── Prompt Step ───────────────────────────────────────────────

export function PromptConfigForm({ config, onChange }: StepConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>System Prompt</Label>
        <textarea
          value={config.systemPrompt || ""}
          onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
          rows={3}
          placeholder="You are an expert analyst..."
          className="w-full px-3 py-2 text-xs focus:outline-none resize-none"
          style={inputStyle}
        />
        <HelpText>Instructions that define the AI's role and behavior.</HelpText>
      </div>

      <div>
        <Label>User Prompt Template</Label>
        <textarea
          value={config.analysisPrompt || ""}
          onChange={(e) => onChange({ ...config, analysisPrompt: e.target.value })}
          rows={4}
          placeholder="Analyze the following data: {{input}}..."
          className="w-full px-3 py-2 text-xs focus:outline-none resize-none"
          style={inputStyle}
        />
        <HelpText>
          The prompt sent to the model. Use {"{{input}}"} to reference previous step output.
        </HelpText>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Model</Label>
          <select
            value={config.model || "gpt-4o"}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
            className="w-full px-3 py-2 text-xs focus:outline-none"
            style={inputStyle}
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-sonnet-4-20250514">Claude Sonnet</option>
            <option value="claude-opus-4-20250514">Claude Opus</option>
          </select>
        </div>

        <div>
          <Label>Temperature</Label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={config.temperature ?? 0.7}
            onChange={(e) =>
              onChange({ ...config, temperature: parseFloat(e.target.value) || 0.7 })
            }
            className="w-full px-3 py-2 text-xs focus:outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <Label>Max Tokens</Label>
        <input
          type="number"
          min={100}
          max={16384}
          step={100}
          value={config.maxTokens || 4096}
          onChange={(e) =>
            onChange({ ...config, maxTokens: parseInt(e.target.value) || 4096 })
          }
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div>
        <Label>Output Format</Label>
        <select
          value={config.outputFormat || "markdown"}
          onChange={(e) => onChange({ ...config, outputFormat: e.target.value })}
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        >
          <option value="markdown">Markdown</option>
          <option value="text">Plain Text</option>
          <option value="json">JSON</option>
        </select>
      </div>
    </div>
  );
}

// ─── Tool Step ─────────────────────────────────────────────────

export function ToolConfigForm({ config, onChange }: StepConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Tool Name</Label>
        <select
          value={config.toolName || ""}
          onChange={(e) => onChange({ ...config, toolName: e.target.value })}
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        >
          <option value="">Select a tool...</option>
          <option value="web_search">Web Search</option>
          <option value="document_parse">Document Parse</option>
          <option value="data_extract">Data Extract</option>
          <option value="sentiment_analysis">Sentiment Analysis</option>
          <option value="summarize">Summarize</option>
          <option value="translate">Translate</option>
          <option value="code_execute">Code Execute</option>
        </select>
        <HelpText>The function or tool to invoke.</HelpText>
      </div>

      <div>
        <Label>Input Mapping</Label>
        <textarea
          value={config.inputMapping || ""}
          onChange={(e) => onChange({ ...config, inputMapping: e.target.value })}
          rows={3}
          placeholder='{"query": "{{previousStep.output}}"}'
          className="w-full px-3 py-2 text-xs font-mono focus:outline-none resize-none"
          style={inputStyle}
        />
        <HelpText>
          JSON mapping of tool parameters. Use {"{{previousStep.output}}"} for prior step data.
        </HelpText>
      </div>

      <div>
        <Label>Timeout (seconds)</Label>
        <input
          type="number"
          min={5}
          max={300}
          value={config.timeout || 30}
          onChange={(e) =>
            onChange({ ...config, timeout: parseInt(e.target.value) || 30 })
          }
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

// ─── Data Pull Step ────────────────────────────────────────────

export function DataPullConfigForm({ config, onChange }: StepConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Data Source</Label>
        <select
          value={config.source || "vault"}
          onChange={(e) => onChange({ ...config, source: e.target.value })}
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        >
          <option value="vault">Vault</option>
          <option value="document">Document</option>
          <option value="integration">Integration</option>
          <option value="url">URL</option>
        </select>
      </div>

      <div>
        <Label>Query / Search Term</Label>
        <input
          type="text"
          value={config.query || ""}
          onChange={(e) => onChange({ ...config, query: e.target.value })}
          placeholder="Search query or filter expression..."
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        />
      </div>

      {config.source === "url" && (
        <div>
          <Label>URL</Label>
          <input
            type="text"
            value={config.url || ""}
            onChange={(e) => onChange({ ...config, url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 text-xs focus:outline-none"
            style={inputStyle}
          />
        </div>
      )}

      <div>
        <Label>Result Limit</Label>
        <input
          type="number"
          min={1}
          max={100}
          value={config.limit || 10}
          onChange={(e) =>
            onChange({ ...config, limit: parseInt(e.target.value) || 10 })
          }
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

// ─── Action Step ───────────────────────────────────────────────

export function ActionConfigForm({ config, onChange }: StepConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Action Type</Label>
        <select
          value={config.action || "notify"}
          onChange={(e) => onChange({ ...config, action: e.target.value })}
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        >
          <option value="send_email">Send Email</option>
          <option value="create_document">Create Document</option>
          <option value="update_integration">Update Integration</option>
          <option value="call_webhook">Call Webhook</option>
          <option value="notify">Notify</option>
        </select>
      </div>

      <div>
        <Label>Action Parameters (JSON)</Label>
        <textarea
          value={
            typeof config.params === "object"
              ? JSON.stringify(config.params, null, 2)
              : config.params || "{}"
          }
          onChange={(e) => {
            try {
              const params = JSON.parse(e.target.value);
              onChange({ ...config, params });
            } catch {
              // Keep raw text while user is typing
            }
          }}
          rows={4}
          placeholder='{"to": "user@example.com", "subject": "..."}'
          className="w-full px-3 py-2 text-xs font-mono focus:outline-none resize-none"
          style={inputStyle}
        />
        <HelpText>
          JSON object with action-specific parameters.
        </HelpText>
      </div>
    </div>
  );
}

// ─── Branch Step ───────────────────────────────────────────────

export function BranchConfigForm({ config, onChange }: StepConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Condition Expression</Label>
        <input
          type="text"
          value={config.expression || ""}
          onChange={(e) => onChange({ ...config, expression: e.target.value })}
          placeholder='context.score > 0.8'
          className="w-full px-3 py-2 text-xs font-mono focus:outline-none"
          style={inputStyle}
        />
        <HelpText>
          JavaScript expression evaluated against the workflow context. Returns true/false.
        </HelpText>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>True: Go to Step Index</Label>
          <input
            type="number"
            min={0}
            value={config.trueStepIndex ?? ""}
            onChange={(e) =>
              onChange({ ...config, trueStepIndex: parseInt(e.target.value) || 0 })
            }
            placeholder="Step index..."
            className="w-full px-3 py-2 text-xs focus:outline-none"
            style={inputStyle}
          />
          <HelpText>Step index to execute when condition is true.</HelpText>
        </div>

        <div>
          <Label>False: Go to Step Index</Label>
          <input
            type="number"
            min={-1}
            value={config.falseStepIndex ?? ""}
            onChange={(e) =>
              onChange({
                ...config,
                falseStepIndex: parseInt(e.target.value),
              })
            }
            placeholder="-1 = end workflow"
            className="w-full px-3 py-2 text-xs focus:outline-none"
            style={inputStyle}
          />
          <HelpText>Step index when false. Use -1 to end workflow.</HelpText>
        </div>
      </div>
    </div>
  );
}

// ─── Loop Step ─────────────────────────────────────────────────

export function LoopConfigForm({ config, onChange }: StepConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Items Source</Label>
        <input
          type="text"
          value={config.itemsSource || ""}
          onChange={(e) => onChange({ ...config, itemsSource: e.target.value })}
          placeholder='context.items or context.data.results'
          className="w-full px-3 py-2 text-xs font-mono focus:outline-none"
          style={inputStyle}
        />
        <HelpText>
          Expression that resolves to an array of items to iterate over.
        </HelpText>
      </div>

      <div>
        <Label>Max Iterations</Label>
        <input
          type="number"
          min={1}
          max={1000}
          value={config.maxIterations || 10}
          onChange={(e) =>
            onChange({
              ...config,
              maxIterations: parseInt(e.target.value) || 10,
            })
          }
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        />
        <HelpText>Safety limit to prevent runaway loops.</HelpText>
      </div>

      <div>
        <Label>Loop Body Description</Label>
        <textarea
          value={config.bodyDescription || ""}
          onChange={(e) => onChange({ ...config, bodyDescription: e.target.value })}
          rows={2}
          placeholder="Describe what should happen for each item..."
          className="w-full px-3 py-2 text-xs focus:outline-none resize-none"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

// ─── Human Review Step ─────────────────────────────────────────

export function HumanReviewConfigForm({ config, onChange }: StepConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Reviewer Prompt</Label>
        <textarea
          value={config.reviewerPrompt || ""}
          onChange={(e) =>
            onChange({ ...config, reviewerPrompt: e.target.value })
          }
          rows={3}
          placeholder="Please review the analysis and approve or reject..."
          className="w-full px-3 py-2 text-xs focus:outline-none resize-none"
          style={inputStyle}
        />
        <HelpText>
          Instructions shown to the human reviewer at this approval gate.
        </HelpText>
      </div>

      <div>
        <Label>Timeout (hours)</Label>
        <input
          type="number"
          min={1}
          max={168}
          value={config.timeoutHours || 24}
          onChange={(e) =>
            onChange({
              ...config,
              timeoutHours: parseInt(e.target.value) || 24,
            })
          }
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        />
        <HelpText>
          How long to wait for review before auto-escalating. Max 168 hours (7 days).
        </HelpText>
      </div>

      <div>
        <Label>On Timeout</Label>
        <select
          value={config.onTimeout || "escalate"}
          onChange={(e) => onChange({ ...config, onTimeout: e.target.value })}
          className="w-full px-3 py-2 text-xs focus:outline-none"
          style={inputStyle}
        >
          <option value="escalate">Escalate</option>
          <option value="auto_approve">Auto Approve</option>
          <option value="auto_reject">Auto Reject</option>
          <option value="pause">Pause Workflow</option>
        </select>
      </div>
    </div>
  );
}

// ─── Form Router ───────────────────────────────────────────────

export function StepConfigForm({
  stepType,
  config,
  onChange,
}: {
  stepType: string;
  config: StepConfig;
  onChange: (config: StepConfig) => void;
}) {
  switch (stepType) {
    case "prompt":
      return <PromptConfigForm config={config} onChange={onChange} />;
    case "tool":
      return <ToolConfigForm config={config} onChange={onChange} />;
    case "data_pull":
      return <DataPullConfigForm config={config} onChange={onChange} />;
    case "action":
      return <ActionConfigForm config={config} onChange={onChange} />;
    case "branch":
      return <BranchConfigForm config={config} onChange={onChange} />;
    case "loop":
      return <LoopConfigForm config={config} onChange={onChange} />;
    case "human_review":
      return <HumanReviewConfigForm config={config} onChange={onChange} />;
    default:
      return (
        <div>
          <label
            className="text-xs uppercase tracking-widest mb-2 block"
            style={labelStyle}
          >
            Configuration (JSON)
          </label>
          <textarea
            value={JSON.stringify(config, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // Invalid JSON
              }
            }}
            rows={6}
            className="w-full px-3 py-2 text-xs font-mono focus:outline-none resize-none"
            style={inputStyle}
          />
        </div>
      );
  }
}
