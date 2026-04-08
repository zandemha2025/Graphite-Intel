import type { AuthUser } from "@workspace/api-client-react";

export interface AuthUserWithOrg extends AuthUser {
  orgId?: number;
  orgRole?: string;
}
