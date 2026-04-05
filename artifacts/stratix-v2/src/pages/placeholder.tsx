import { Page } from "@/components/layout/page";

function makePlaceholder(title: string, subtitle?: string, fullWidth?: boolean) {
  return function PlaceholderPage() {
    return (
      <Page title={title} subtitle={subtitle} fullWidth={fullWidth}>
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-[#E5E5E3] rounded-xl">
          <p className="text-sm text-[#9CA3AF]">
            {title} page — coming soon
          </p>
        </div>
      </Page>
    );
  };
}

// INTELLIGENCE
export const Explore = makePlaceholder("Explore", "Discover intelligence across your data", true);
export const Notebooks = makePlaceholder("Notebooks", "Collaborative analysis notebooks");
export const NotebookEdit = makePlaceholder("Notebook", "Edit notebook");
export const Boards = makePlaceholder("Boards", "Visual dashboards and layouts");
export const BoardView = makePlaceholder("Board", "Board detail view");
export const Reports = makePlaceholder("Reports", "Generate and review reports");
export const ReportNew = makePlaceholder("New Report", "Create a new report");
export const ReportView = makePlaceholder("Report", "Report detail view");

// OPERATIONS
export const Workflows = makePlaceholder("Workflows", "Automated intelligence workflows");
export const WorkflowRunner = makePlaceholder("Run Workflow", "Execute a workflow");
export const WorkflowBuilder = makePlaceholder("Workflow Builder", "Build custom workflows");
export const Playbooks = makePlaceholder("Playbooks", "Standard operating procedures");
export const PlaybookEdit = makePlaceholder("Playbook", "Edit playbook");
export const PlaybookRun = makePlaceholder("Playbook Run", "View playbook execution");
export const AdsDashboard = makePlaceholder("Ads", "Advertising campaign management");
export const AdsCampaignNew = makePlaceholder("New Campaign", "Create a new ad campaign");
export const AdsCampaignDetail = makePlaceholder("Campaign", "Campaign detail view");

// KNOWLEDGE
export const Knowledge = makePlaceholder("Knowledge", "Knowledge base");
export const Context = makePlaceholder("Context", "Contextual intelligence feeds");
export const Vault = makePlaceholder("Vault", "Secure document storage");
export const VaultSearch = makePlaceholder("Vault Search", "Search vault documents");
export const VaultProject = makePlaceholder("Vault Project", "Project document view");
export const Connections = makePlaceholder("Connections", "Data source connections");

// ADMIN
export const Analytics = makePlaceholder("Analytics", "Platform usage and metrics");
export const AuditLog = makePlaceholder("Audit Log", "Activity audit trail");

// SETTINGS & USER
export const Profile = makePlaceholder("Profile", "Your profile settings");
export const Team = makePlaceholder("Team", "Team management");
export const Security = makePlaceholder("Security", "Security settings");
export const ActivityFeed = makePlaceholder("Activity", "Recent activity feed");
export const SharedItems = makePlaceholder("Shared", "Items shared with you");

// AUTH & ONBOARDING
export const Landing = makePlaceholder("Welcome to Stratix", "Intelligence platform");
export const Login = makePlaceholder("Login", "Sign in to your account");
export const OrgSetup = makePlaceholder("Organization Setup", "Set up your organization");
export const Onboarding = makePlaceholder("Onboarding", "Get started with Stratix");
