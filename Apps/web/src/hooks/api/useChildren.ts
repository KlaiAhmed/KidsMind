import { useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { childStore } from '../../store/child.store';
import type { ChildRecord } from '../../store/child.store';
import { useApiQuery, type UseApiQueryResult } from './core';

export interface ChildrenResponse {
  children?: ChildRecord[];
  items?: ChildRecord[];
}

export type UseChildrenResult = UseApiQueryResult<ChildRecord[]>;

const normalizeChildren = (payload: ChildrenResponse | ChildRecord[]): ChildRecord[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.children)) {
    return payload.children;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

export const useChildren = (): UseChildrenResult => {
  const query = useApiQuery<ChildRecord[]>({
    queryKey: 'children:list',
    staleTime: 5 * 60 * 1000,
    queryFn: async (signal) => {
      const response = await apiClient.get<ChildrenResponse | ChildRecord[]>('/api/v1/children', { signal });

      return {
        ...response,
        data: normalizeChildren(response.data),
      };
    },
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    childStore.setChildren(query.data);
  }, [query.data]);

  return query;
};
