import { useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { childStore } from '../../store/child.store';
import type { ChildRecord } from '../../store/child.store';
import { useApiQuery, type UseApiQueryResult } from './core';

export interface ChildrenResponse {
  children?: RawChildRecord[];
  items?: RawChildRecord[];
}

interface RawChildRecord extends Omit<ChildRecord, 'child_id'> {
  child_id?: number;
  id?: number;
}

export type UseChildrenResult = UseApiQueryResult<ChildRecord[]>;

const normalizeChildren = (payload: ChildrenResponse | RawChildRecord[]): RawChildRecord[] => {
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

const normalizeChild = (rawChild: RawChildRecord): ChildRecord | null => {
  const normalizedChildId = Number(rawChild.child_id ?? rawChild.id);
  if (!Number.isFinite(normalizedChildId)) {
    return null;
  }

  return {
    ...rawChild,
    child_id: normalizedChildId,
  };
};

export const useChildren = (): UseChildrenResult => {
  const query = useApiQuery<ChildRecord[]>({
    queryKey: 'children:list',
    staleTime: 5 * 60 * 1000,
    queryFn: async (signal) => {
      const response = await apiClient.get<ChildrenResponse | RawChildRecord[]>('/api/v1/children', { signal });

      const normalizedChildren = normalizeChildren(response.data)
        .map((child) => normalizeChild(child))
        .filter((child): child is ChildRecord => child !== null);

      return {
        ...response,
        data: normalizedChildren,
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
