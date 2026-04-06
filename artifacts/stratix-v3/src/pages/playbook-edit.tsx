import { useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, apiPost, apiPatch } from "@/lib/api";
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Save,
  Loader2,
  Check,
  FileText,
  Search,
  MessageSquare,
  BarChart3,
  Zap,
} from "lucide-react";

/* ---------- Types ---------- */

interface PlaybookStep {
  title: string;
  description: string;
  type: string;
}

interface Playbook {
  id: string;
  title: string;
  description?: string;
  steps: PlaybookStep[];
  status: "draft" | "active" | "archived";
  isTemplate: boolean;
  updatedAt: string;
  createdAt: string;
}

interface PlaybookRun {
  id: string;
  playbookId: string;
  status: string;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Step type icon ---------- */

function StepTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "research":
      return <Search className="h-3.5 w-3.5" />;
    case "analysis":
      return <BarChart3 className="h-3.5 w-3.5" />;
    case "review":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "action":
      return <Zap className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

/* ---------- Step Editor ---------- */

function StepEditor({
  step,
  index,
  totalSteps,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  step: PlaybookStep;
  index: number;
  totalSteps: number;
  onUpdate: (index: number, step: PlaybookStep) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);
  const [type, setType] = useState(step.type);

  function handleSave() {
    onUpdate(index, { title, description, type });
    setEditing(false);
  }

  function handleCancel() {
    setTitle(step.title);
    setDescription(step.description);
    setType(step.type);
    setEditing(false);
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-stretch">
        {/* Reorder controls */}
        <div className="flex flex-col items-center justify-center border-r border-[#E5E7EB] bg-[#F9FAFB] px-2">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="rounded p-0.5 text-[#9CA3AF] hover:text-[#6B7280] disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <span className="my-0.5 text-[10px] font-medium text-[#9CA3AF]">
            {index + 1}
          </span>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalSteps - 1}
            className="rounded p-0.5 text-[#9CA3AF] hover:text-[#6B7280] disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Step content */}
        <div className="flex-1 p-3">
          {editing ? (
            <div className="space-y-3">
              <Input
                placeholder="Step title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Step description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#6B7280]">
                  Step type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                >
                  <option value="research">Research</option>
                  <option value="analysis">Analysis</option>
                  <option value="review">Review</option>
                  <option value="action">Action</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="cursor-pointer"
              onClick={() => setEditing(true)}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-[#EEF2FF] text-[#4F46E5]">
                  <StepTypeIcon type={step.type} />
                </div>
                <p className="text-sm font-medium text-[#111827]">
                  {step.title || "Untitled step"}
                </p>
                <Badge variant="default" className="ml-auto text-[10px]">
                  {step.type}
                </Badge>
              </div>
              {step.description && (
                <p className="mt-1 ml-7 text-xs text-[#6B7280] line-clamp-2">
                  {step.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="flex items-center border-l border-[#E5E7EB] px-2">
          <button
            onClick={() => onDelete(index)}
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Add Step ---------- */

function AddStepButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white py-3 text-sm font-medium text-[#6B7280] transition-colors hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
    >
      <Plus className="h-4 w-4" />
      Add Step
    </button>
  );
}

/* ---------- Main Page ---------- */

export default function PlaybookEditPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const playbookId = params.id ?? "";

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle",
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: playbook,
    isLoading,
    isError,
  } = useQuery<Playbook>({
    queryKey: ["playbook", playbookId],
    queryFn: () =>
      api<{ playbook: Playbook }>(`/playbooks/${playbookId}`).then(
        (r) => r.playbook,
      ),
    enabled: !!playbookId,
  });

  /* Title auto-save */
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const displayTitle = editTitle ?? playbook?.title ?? "Untitled";

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Playbook>) =>
      apiPatch(`/playbooks/${playbookId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook", playbookId] });
      setSaveStatus("saved");
    },
    onError: () => {
      toast.error("Failed to save");
      setSaveStatus("idle");
    },
  });

  const handleTitleChange = useCallback(
    (value: string) => {
      setEditTitle(value);
      setSaveStatus("saving");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveMutation.mutate({ title: value });
      }, 800);
    },
    [saveMutation],
  );

  /* Step operations */
  function updateSteps(newSteps: PlaybookStep[]) {
    saveMutation.mutate({ steps: newSteps } as Partial<Playbook>);
  }

  function handleStepUpdate(index: number, step: PlaybookStep) {
    if (!playbook) return;
    const newSteps = [...playbook.steps];
    newSteps[index] = step;
    updateSteps(newSteps);
  }

  function handleStepDelete(index: number) {
    if (!playbook) return;
    const newSteps = playbook.steps.filter((_, i) => i !== index);
    updateSteps(newSteps);
  }

  function handleMoveUp(index: number) {
    if (!playbook || index === 0) return;
    const newSteps = [...playbook.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1]!;
    newSteps[index - 1] = temp!;
    updateSteps(newSteps);
  }

  function handleMoveDown(index: number) {
    if (!playbook || index === playbook.steps.length - 1) return;
    const newSteps = [...playbook.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1]!;
    newSteps[index + 1] = temp!;
    updateSteps(newSteps);
  }

  function handleAddStep() {
    if (!playbook) return;
    const newSteps = [
      ...playbook.steps,
      { title: "", description: "", type: "task" },
    ];
    updateSteps(newSteps);
  }

  /* AI Generate */
  const generateMutation = useMutation({
    mutationFn: () =>
      apiPost<{ playbook: Playbook }>(
        `/playbooks/${playbookId}/generate`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook", playbookId] });
      toast.success("Steps generated by AI");
    },
    onError: () => {
      toast.error("Failed to generate steps");
    },
  });

  /* Run Playbook */
  const runMutation = useMutation({
    mutationFn: () =>
      apiPost<{ run: PlaybookRun }>(
        `/playbooks/${playbookId}/execute`,
        {},
      ),
    onSuccess: (data) => {
      navigate(`/playbooks/runs/${data.run.id}`);
      toast.success("Playbook run started");
    },
    onError: () => {
      toast.error("Failed to start playbook run");
    },
  });

  /* Save all */
  function handleSaveAll() {
    if (!playbook) return;
    saveMutation.mutate({
      title: editTitle ?? playbook.title,
      steps: playbook.steps,
    } as Partial<Playbook>);
    toast.success("Playbook saved");
  }

  /* Loading state */
  if (isLoading) {
    return (
      <Page title="Loading..." subtitle="">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </Page>
    );
  }

  /* Error state */
  if (isError || !playbook) {
    return (
      <Page title="Playbook not found" subtitle="">
        <Card className="flex flex-col items-center justify-center py-16">
          <FileText className="mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-sm font-medium text-[#111827]">
            Could not load this playbook
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            It may have been deleted or you may not have access.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/playbooks")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Playbooks
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/playbooks")}
            className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <input
              type="text"
              value={displayTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="border-0 bg-transparent text-lg font-semibold text-[#111827] focus:outline-none"
              placeholder="Untitled Playbook"
            />
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9CA3AF]">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  Saved
                </>
              )}
              {saveStatus === "idle" && (
                <span>
                  {playbook.steps.length} step
                  {playbook.steps.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Generate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveAll}
            loading={saveMutation.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => runMutation.mutate()}
            loading={runMutation.isPending}
            disabled={playbook.steps.length === 0}
          >
            <Play className="h-3.5 w-3.5" />
            Run Playbook
          </Button>
        </div>
      </div>

      {/* Description */}
      {playbook.description && (
        <p className="mb-5 text-sm text-[#6B7280]">{playbook.description}</p>
      )}

      {/* Step list */}
      <div className="space-y-2">
        {playbook.steps.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-3 h-8 w-8 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#111827]">
              No steps yet
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Add steps manually or use AI Generate to create them
              automatically.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Generate
              </Button>
              <Button size="sm" onClick={handleAddStep}>
                <Plus className="h-3.5 w-3.5" />
                Add Step
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {playbook.steps.map((step, i) => (
              <StepEditor
                key={i}
                step={step}
                index={i}
                totalSteps={playbook.steps.length}
                onUpdate={handleStepUpdate}
                onDelete={handleStepDelete}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </>
        )}
      </div>

      {/* Add step button */}
      {playbook.steps.length > 0 && (
        <div className="mt-3">
          <AddStepButton onAdd={handleAddStep} />
        </div>
      )}
    </div>
  );
}
