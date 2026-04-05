import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "analyst" | "viewer";
  orgId?: number;
  orgName?: string;
  onboardingComplete?: boolean;
}

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["auth", "user"],
    queryFn: () => api<User>("/auth/user"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return { user, isLoading, isError };
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost("/logout", {}),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}
