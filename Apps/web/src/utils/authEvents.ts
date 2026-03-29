const AUTH_STATE_CHANGED_EVENT = 'kidsmind:auth-state-changed';

const dispatchAuthStateChanged = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
};

export {
  AUTH_STATE_CHANGED_EVENT,
  dispatchAuthStateChanged,
};