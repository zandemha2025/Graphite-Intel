/**
 * RBAC Permission System for Stratix
 *
 * Roles: owner > admin > editor > viewer
 * Resource types: report, workflow, document, conversation, team, integration
 * Actions: create, read, update, delete, share, export, manage_team, manage_billing
 */

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const RESOURCE_TYPES = {
  REPORT: "report",
  WORKFLOW: "workflow",
  DOCUMENT: "document",
  CONVERSATION: "conversation",
  TEAM: "team",
  INTEGRATION: "integration",
  ANALYTICS: "analytics",
} as const;

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

export const ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  SHARE: "share",
  EXPORT: "export",
  MANAGE_TEAM: "manage_team",
  MANAGE_BILLING: "manage_billing",
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

/**
 * Role → allowed actions mapping.
 * Each role inherits all permissions from roles below it.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Action[]> = {
  owner: [
    "create", "read", "update", "delete", "share", "export",
    "manage_team", "manage_billing",
  ],
  admin: [
    "create", "read", "update", "delete", "share", "export",
    "manage_team",
  ],
  editor: [
    "create", "read", "update", "export",
  ],
  viewer: [
    "read",
  ],
} as const;

/**
 * Resource-specific permission overrides.
 * For example, editors can't delete documents but can create/update them.
 */
export const RESOURCE_PERMISSION_OVERRIDES: Partial<
  Record<ResourceType, Partial<Record<Role, readonly Action[]>>>
> = {
  team: {
    editor: ["read"],
    viewer: ["read"],
  },
  integration: {
    editor: ["read"],
    viewer: ["read"],
  },
  analytics: {
    editor: ["read"],
    viewer: ["read"],
  },
};

/**
 * Check whether a role has permission to perform an action on a resource.
 */
export function hasPermission(
  role: string,
  resourceType: string,
  action: string,
): boolean {
  const normalizedRole = role as Role;
  const normalizedResource = resourceType as ResourceType;
  const normalizedAction = action as Action;

  // Legacy "member" role maps to "editor"
  const effectiveRole = normalizedRole === ("member" as Role) ? ROLES.EDITOR : normalizedRole;

  // Check resource-specific overrides first
  const overrides = RESOURCE_PERMISSION_OVERRIDES[normalizedResource];
  if (overrides && overrides[effectiveRole]) {
    return (overrides[effectiveRole] as readonly string[]).includes(normalizedAction);
  }

  // Fall back to global role permissions
  const permissions = ROLE_PERMISSIONS[effectiveRole];
  if (!permissions) return false;

  return (permissions as readonly string[]).includes(normalizedAction);
}

/**
 * Get the numeric rank of a role (higher = more powerful).
 */
export function roleRank(role: string): number {
  const ranks: Record<string, number> = {
    viewer: 0,
    editor: 1,
    member: 1, // legacy
    admin: 2,
    owner: 3,
  };
  return ranks[role] ?? -1;
}
