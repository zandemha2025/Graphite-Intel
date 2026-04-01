import { Inngest } from "inngest";
import type { GrphintelEvents } from "./events";

export const inngest = new Inngest({
  id: "grphintel",
  schemas: new Map() as any, // Type-safe events via GrphintelEvents
});

// Re-export typed client for use in function definitions
export type InngestClient = typeof inngest;
