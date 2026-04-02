import { useSyncExternalStore } from 'react';

const ACTIVE_CHILD_STORAGE_KEY = 'kidsmind_active_child_id';

export interface ChildSettingsJson {
  daily_limit_minutes?: number;
  dailyLimitMinutes?: number;
  enable_voice?: boolean;
  enableVoice?: boolean;
  allowed_subjects?: string[];
  allowedSubjects?: string[];
  allowed_weekdays?: string[];
  allowedWeekdays?: string[];
  store_audio_history?: boolean;
  storeAudioHistory?: boolean;
}

export interface ChildRecord {
  child_id: number;
  nickname: string;
  avatar?: string;
  birth_date?: string;
  age?: number;
  education_stage?: string;
  languages?: string[];
  is_active?: boolean;
  is_accelerated?: boolean;
  is_below_expected_stage?: boolean;
  settings_json?: ChildSettingsJson;
}

export interface ChildStoreState {
  children: ChildRecord[];
  activeChild: ChildRecord | null;
}

type ChildListener = () => void;

const getPersistedActiveChildId = (): number | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const persistActiveChildId = (childId: number | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (childId === null) {
    window.localStorage.removeItem(ACTIVE_CHILD_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(childId));
};

let state: ChildStoreState = {
  children: [],
  activeChild: null,
};

const listeners = new Set<ChildListener>();

const emitChange = (): void => {
  listeners.forEach((listener) => listener());
};

const setState = (nextState: ChildStoreState): void => {
  state = nextState;
  emitChange();
};

const subscribe = (listener: ChildListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getState = (): ChildStoreState => state;

const chooseActiveChild = (children: ChildRecord[]): ChildRecord | null => {
  if (children.length === 0) {
    return null;
  }

  const persistedId = getPersistedActiveChildId();
  if (persistedId !== null) {
    const persistedChild = children.find((child) => child.child_id === persistedId);
    if (persistedChild) {
      return persistedChild;
    }
  }

  return children[0] ?? null;
};

const setChildren = (children: ChildRecord[]): void => {
  const nextActiveChild = chooseActiveChild(children);
  persistActiveChildId(nextActiveChild?.child_id ?? null);

  setState({
    children,
    activeChild: nextActiveChild,
  });
};

const setActiveChild = (child: ChildRecord | null): void => {
  persistActiveChildId(child?.child_id ?? null);

  setState({
    ...state,
    activeChild: child,
  });
};

const useChildStore = (): ChildStoreState => {
  return useSyncExternalStore(subscribe, getState, getState);
};

export const childStore = {
  getState,
  subscribe,
  setChildren,
  setActiveChild,
};

export { ACTIVE_CHILD_STORAGE_KEY, useChildStore };
