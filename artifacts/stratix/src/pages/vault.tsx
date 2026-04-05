import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { FolderOpen, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type VaultProject = {
  id: number;
  name: string;
  description: string;
  matterType: string;
  documentCount: number;
  status: "active" | "archived";
  createdAt: string;
};

export function Vault() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    matterType: "",
  });

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/vault/projects", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      toast({ title: "Failed to load projects", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Project name is required", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/vault/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const newProject = await res.json();
      setProjects([newProject, ...projects]);
      setFormData({ name: "", description: "", matterType: "" });
      setShowCreateForm(false);
      toast({ title: `Project "${newProject.name}" created` });
    } catch (err) {
      toast({ title: "Failed to create project", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;

    fetch(`/api/vault/projects/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete project");
        setProjects(projects.filter((p) => p.id !== id));
        toast({ title: `Project deleted` });
      })
      .catch(() => {
        toast({ title: "Failed to delete project", variant: "destructive" });
      });
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.matterType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b"
        style={{ borderColor: "var(--workspace-border)" }}
      >
        <div>
          <h1
            className="font-sans text-2xl font-semibold tracking-tight mb-2"
            style={{ color: "var(--workspace-fg)" }}
          >
            Vault
          </h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            Bulk document analysis and extraction projects.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search
              className="absolute left-3 top-2.5 h-3.5 w-3.5"
              style={{ color: "var(--workspace-muted)" }}
            />
            <input
              type="search"
              placeholder="Search projects..."
              className="w-full pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--workspace-border)",
                color: "var(--workspace-fg)",
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium shrink-0 transition-colors"
            style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div
          className="p-5 border"
          style={{
            borderColor: "var(--workspace-border)",
            background: "#FFFFFF",
          }}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                Project Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Q1 Financial Analysis"
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                  background: "var(--workspace-muted-bg)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What is this project about?"
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                  background: "var(--workspace-muted-bg)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                Matter Type
              </label>
              <select
                value={formData.matterType}
                onChange={(e) =>
                  setFormData({ ...formData, matterType: e.target.value })
                }
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                  background: "var(--workspace-muted-bg)",
                }}
              >
                <option value="">Select matter type...</option>
                <option value="financial">Financial</option>
                <option value="legal">Legal</option>
                <option value="commercial">Commercial</option>
                <option value="research">Research</option>
                <option value="operational">Operational</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-muted)",
                  background: "#FFFFFF",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
              >
                {isCreating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse"
              style={{
                border: "1px solid var(--workspace-border)",
                background: "var(--workspace-muted-bg)",
              }}
            />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          className="py-16 text-center border-dashed"
          style={{ border: "1px dashed var(--workspace-border)" }}
        >
          <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--workspace-muted-bg)", border: "1px solid var(--workspace-border)" }}>
            <FolderOpen
              className="h-6 w-6"
              style={{ color: "var(--workspace-muted)" }}
            />
          </div>
          <h3
            className="font-sans text-xl font-light mb-2"
            style={{ color: "var(--workspace-fg)" }}
          >
            {searchTerm ? "No projects found" : "Create a project to organize your documents"}
          </h3>
          <p
            className="text-sm mb-6 max-w-sm mx-auto"
            style={{ color: "var(--workspace-muted)" }}
          >
            {searchTerm
              ? "No projects match your search. Try different terms."
              : "Projects let you group documents for bulk analysis, extraction, and review across financial, legal, and research matters."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-colors"
              style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/vault/${project.id}`}
              className="group p-5 border transition-all hover:shadow-sm"
              style={{
                borderColor: "var(--workspace-border)",
                background: "#FFFFFF",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--workspace-fg)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--workspace-border)")
              }
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <FolderOpen
                    className="h-4 w-4 shrink-0 mt-1"
                    style={{ color: "var(--workspace-muted)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-sans text-base font-light transition-colors truncate"
                      style={{ color: "var(--workspace-fg)" }}
                    >
                      {project.name}
                    </h3>
                    {project.description && (
                      <p
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: "var(--workspace-muted)" }}
                      >
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                  style={{ color: "var(--workspace-muted)" }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(project.id, project.name);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap mt-4">
                {project.matterType && (
                  <span
                    className="text-xs font-medium px-2 py-0.5"
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: "var(--workspace-muted)",
                    }}
                  >
                    {project.matterType}
                  </span>
                )}
                <span
                  className="text-[10px]"
                  style={{
                    color: "var(--workspace-muted)",
                    opacity: 0.7,
                  }}
                >
                  {project.documentCount} document{project.documentCount !== 1 ? "s" : ""}
                </span>
                <span
                  className="text-[10px]"
                  style={{
                    color: "var(--workspace-muted)",
                    opacity: 0.6,
                  }}
                >
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
