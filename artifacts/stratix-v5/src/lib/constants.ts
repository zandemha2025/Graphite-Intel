import { Sparkles, Hammer, Radar, Plug, Settings, Info, Bell, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/solve", label: "Solve", icon: Sparkles },
  { href: "/build", label: "Build", icon: Hammer },
  { href: "/intelligence", label: "Intelligence", icon: Radar },
  { href: "/connect", label: "Connect", icon: Plug },
];

export const BOTTOM_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export const FULL_BLEED_ROUTES = ["/solve"];
