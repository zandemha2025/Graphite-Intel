import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SECURITY_ITEMS = [
  {
    title: "Data Encryption",
    description: "All data is encrypted at rest using AES-256 and in transit using TLS 1.3.",
    status: "Active",
  },
  {
    title: "SOC 2 Type II Compliance",
    description: "Stratix undergoes annual SOC 2 Type II audits to ensure security, availability, and confidentiality.",
    status: "Certified",
  },
  {
    title: "GDPR Compliance",
    description: "We comply with GDPR data protection regulations for all EU customer data.",
    status: "Compliant",
  },
  {
    title: "Access Controls",
    description: "Role-based access control (RBAC) ensures users only access what they need. All access is logged.",
    status: "Enforced",
  },
  {
    title: "Infrastructure",
    description: "Hosted on SOC 2 certified cloud infrastructure with automated failover and 99.99% uptime SLA.",
    status: "Active",
  },
  {
    title: "Vulnerability Management",
    description: "Continuous vulnerability scanning and penetration testing performed by third-party security firms.",
    status: "Monitored",
  },
];

export default function SecurityPage() {
  return (
    <Page title="Security" subtitle="How we protect your data">
      <div className="space-y-4 max-w-2xl">
        {SECURITY_ITEMS.map((item) => (
          <Card key={item.title} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[#0A0A0A] mb-1">{item.title}</h3>
              <p className="text-sm text-[#404040]">{item.description}</p>
            </div>
            <Badge variant="success">{item.status}</Badge>
          </Card>
        ))}
      </div>
    </Page>
  );
}
