import type { AuthUser } from "@workspace/api-client-react";

/**
 * Extended auth user type that includes organization fields
 * returned by the server but not present in the generated OpenAPI schema.
 */
export interface AuthUserWithOrg extends AuthUser {
  orgId?: number;
  orgRole?: string;
}
