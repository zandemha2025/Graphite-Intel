import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import {
  Shield,
  Lock,
  Globe,
  Users,
  Server,
  Scan,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Org {
  id: number;
  name: string;
  slug: string;
}

interface SecurityPolicy {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
}

const SECURITY_POLICIES: SecurityPolicy[] = [
  {
    title: "Data Encryption",
    description: "All data is encrypted at rest using AES-256 and in transit using TLS 1.3.",
    badge: "Policy",
    icon: Lock,
  },
  {
    title: "SOC 2 Type II Compliance",
    description: "Stratix undergoes annual SOC 2 Type II audits to ensure security, availability, and confidentiality.",
    badge: "Standard",
    icon: Shield,
  },
  {
    title: "GDPR Compliance",
    description: "We comply with GDPR data protection regulations for all EU customer data.",
    badge: "Standard",
    icon: Globe,
  },
  {
    title: "Access Controls",
    description: "Role-based access control (RBAC) ensures users only access what they need. All access is logged.",
    badge: "Policy",
    icon: Users,
  },
  {
    title: "Infrastructure",
    description: "Hosted on SOC 2 certified cloud infrastructure with automated failover and 99.99% uptime SLA.",
    badge: "Policy",
    icon: Server,
  },
  {
    title: "Vulnerability Management",
    description: "Continuous vulnerability scanning and penetration testing performed by third-party security firms.",
    badge: "Policy",
    icon: Scan,
  },
];

export default function SecurityPage() {
  const { data: org } = useQuery<Org>({
    queryKey: ["org"],
    queryFn: () => api<Org>("/org"),
  });

  return (
    <Page title="Security" subtitle="Security policies for your organization">
      <div className="space-y-6 max-w-2xl">
        {org && (
          <Card className="bg-[#F6F5F4]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0A0A0A]">{org.name}</p>
                <p className="text-xs text-[#9CA3AF]">
                  These policies apply to all members of your organization.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {SECURITY_POLICIES.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1">
                  <div className="mt-0.5">
                    <Icon className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#0A0A0A] mb-1">{item.title}</h3>
                    <p className="text-sm text-[#404040]">{item.description}</p>
                  </div>
                </div>
                <Badge variant="info">{item.badge}</Badge>
              </Card>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
