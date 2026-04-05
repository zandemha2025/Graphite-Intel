/**
 * Hand-written React Query hooks for the boards API.
 * These follow the same pattern as the orval-generated hooks in ./generated/api.ts.
 * Once the OpenAPI spec is regenerated via orval, these can be replaced by the generated output.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType, BodyType } from "./custom-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Board {
  id: number;
  orgId: number;
  createdByUserId: string;
  title: string;
  description: string | null;
  type: string;
  config: unknown | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardBody {
  title: string;
  description?: string;
  type?: "live" | "report" | "monitor";
  config?: unknown;
  isShared?: boolean;
}

export interface UpdateBoardBody {
  title?: string;
  description?: string;
  type?: "live" | "report" | "monitor";
  config?: unknown;
  isShared?: boolean;
}

// ---------------------------------------------------------------------------
// listBoards
// ---------------------------------------------------------------------------

export const getListBoardsUrl = () => `/api/boards`;

export const listBoards = async (
  options?: RequestInit,
): Promise<Board[]> => {
  return customFetch<Board[]>(getListBoardsUrl(), {
    ...options,
    method: "GET",
  });
};

export const getListBoardsQueryKey = () => ["listBoards"] as const;

export const getListBoardsQueryOptions = <
  TData = Awaited<ReturnType<typeof listBoards>>,
>(options?: {
  query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listBoards>>, ErrorType<unknown>, TData>>;
  request?: RequestInit;
}) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListBoardsQueryKey();

  const queryFn: QueryFunction<Awaited<ReturnType<typeof listBoards>>> = ({
    signal,
  }) => listBoards({ signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    ...queryOptions,
  } as UseQueryOptions<Awaited<ReturnType<typeof listBoards>>, ErrorType<unknown>, TData> & {
    queryKey: QueryKey;
  };
};

export function useListBoards<
  TData = Awaited<ReturnType<typeof listBoards>>,
>(options?: {
  query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listBoards>>, ErrorType<unknown>, TData>>;
  request?: RequestInit;
}): UseQueryResult<TData, ErrorType<unknown>> {
  const queryOptions = getListBoardsQueryOptions(options);
  return useQuery(queryOptions) as UseQueryResult<TData, ErrorType<unknown>>;
}

// ---------------------------------------------------------------------------
// getBoard
// ---------------------------------------------------------------------------

export const getGetBoardUrl = (id: number) => `/api/boards/${id}`;

export const getBoard = async (
  id: number,
  options?: RequestInit,
): Promise<Board> => {
  return customFetch<Board>(getGetBoardUrl(id), {
    ...options,
    method: "GET",
  });
};

export const getGetBoardQueryKey = (id: number) => ["getBoard", id] as const;

export const getGetBoardQueryOptions = <
  TData = Awaited<ReturnType<typeof getBoard>>,
>(
  id: number,
  options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getBoard>>, ErrorType<unknown>, TData>>;
    request?: RequestInit;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetBoardQueryKey(id);

  const queryFn: QueryFunction<Awaited<ReturnType<typeof getBoard>>> = ({
    signal,
  }) => getBoard(id, { signal, ...requestOptions });

  return {
    queryKey,
    queryFn,
    enabled: !!id,
    ...queryOptions,
  } as UseQueryOptions<Awaited<ReturnType<typeof getBoard>>, ErrorType<unknown>, TData> & {
    queryKey: QueryKey;
  };
};

export function useGetBoard<
  TData = Awaited<ReturnType<typeof getBoard>>,
>(
  id: number,
  options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getBoard>>, ErrorType<unknown>, TData>>;
    request?: RequestInit;
  },
): UseQueryResult<TData, ErrorType<unknown>> {
  const queryOptions = getGetBoardQueryOptions(id, options);
  return useQuery(queryOptions) as UseQueryResult<TData, ErrorType<unknown>>;
}

// ---------------------------------------------------------------------------
// createBoard
// ---------------------------------------------------------------------------

export const getCreateBoardUrl = () => `/api/boards`;

export const createBoard = async (
  createBoardBody: CreateBoardBody,
  options?: RequestInit,
): Promise<Board> => {
  return customFetch<Board>(getCreateBoardUrl(), {
    ...options,
    method: "POST",
    body: JSON.stringify(createBoardBody),
  });
};

export const getCreateBoardMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createBoard>>,
    TError,
    { data: BodyType<CreateBoardBody> },
    TContext
  >;
  request?: RequestInit;
}): UseMutationOptions<
  Awaited<ReturnType<typeof createBoard>>,
  TError,
  { data: BodyType<CreateBoardBody> },
  TContext
> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  const mutationKey = ["createBoard"];

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof createBoard>>,
    { data: BodyType<CreateBoardBody> }
  > = (props) => {
    const { data } = props ?? {};
    return createBoard(data, requestOptions);
  };

  return { mutationKey, mutationFn, ...mutationOptions };
};

export function useCreateBoard<
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof createBoard>>,
    TError,
    { data: BodyType<CreateBoardBody> },
    TContext
  >;
  request?: RequestInit;
}): UseMutationResult<
  Awaited<ReturnType<typeof createBoard>>,
  TError,
  { data: BodyType<CreateBoardBody> },
  TContext
> {
  const mutationOptions = getCreateBoardMutationOptions(options);
  return useMutation(mutationOptions);
}

// ---------------------------------------------------------------------------
// updateBoard
// ---------------------------------------------------------------------------

export const getUpdateBoardUrl = (id: number) => `/api/boards/${id}`;

export const updateBoard = async (
  id: number,
  updateBoardBody: UpdateBoardBody,
  options?: RequestInit,
): Promise<Board> => {
  return customFetch<Board>(getUpdateBoardUrl(id), {
    ...options,
    method: "PATCH",
    body: JSON.stringify(updateBoardBody),
  });
};

export const getUpdateBoardMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updateBoard>>,
    TError,
    { id: number; data: BodyType<UpdateBoardBody> },
    TContext
  >;
  request?: RequestInit;
}): UseMutationOptions<
  Awaited<ReturnType<typeof updateBoard>>,
  TError,
  { id: number; data: BodyType<UpdateBoardBody> },
  TContext
> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  const mutationKey = ["updateBoard"];

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof updateBoard>>,
    { id: number; data: BodyType<UpdateBoardBody> }
  > = (props) => {
    const { id, data } = props ?? {};
    return updateBoard(id, data, requestOptions);
  };

  return { mutationKey, mutationFn, ...mutationOptions };
};

export function useUpdateBoard<
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof updateBoard>>,
    TError,
    { id: number; data: BodyType<UpdateBoardBody> },
    TContext
  >;
  request?: RequestInit;
}): UseMutationResult<
  Awaited<ReturnType<typeof updateBoard>>,
  TError,
  { id: number; data: BodyType<UpdateBoardBody> },
  TContext
> {
  const mutationOptions = getUpdateBoardMutationOptions(options);
  return useMutation(mutationOptions);
}

// ---------------------------------------------------------------------------
// deleteBoard
// ---------------------------------------------------------------------------

export const getDeleteBoardUrl = (id: number) => `/api/boards/${id}`;

export const deleteBoard = async (
  id: number,
  options?: RequestInit,
): Promise<void> => {
  return customFetch<void>(getDeleteBoardUrl(id), {
    ...options,
    method: "DELETE",
  });
};

export const getDeleteBoardMutationOptions = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof deleteBoard>>,
    TError,
    { id: number },
    TContext
  >;
  request?: RequestInit;
}): UseMutationOptions<
  Awaited<ReturnType<typeof deleteBoard>>,
  TError,
  { id: number },
  TContext
> => {
  const { mutation: mutationOptions, request: requestOptions } = options ?? {};
  const mutationKey = ["deleteBoard"];

  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof deleteBoard>>,
    { id: number }
  > = (props) => {
    const { id } = props ?? {};
    return deleteBoard(id, requestOptions);
  };

  return { mutationKey, mutationFn, ...mutationOptions };
};

export function useDeleteBoard<
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof deleteBoard>>,
    TError,
    { id: number },
    TContext
  >;
  request?: RequestInit;
}): UseMutationResult<
  Awaited<ReturnType<typeof deleteBoard>>,
  TError,
  { id: number },
  TContext
> {
  const mutationOptions = getDeleteBoardMutationOptions(options);
  return useMutation(mutationOptions);
}
