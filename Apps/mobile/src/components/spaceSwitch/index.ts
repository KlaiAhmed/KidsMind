/**
 * Space Switch Components - Index
 *
 * Reusable components for Parent <-> Child space switching:
 * - ParentPINGate: PIN verification modal for child -> parent access
 * - ChildSwitchModal: Confirmation modal for parent -> child switch
 * - ChildSpaceHeader: Child space header with parent access controls
 * - useChildNavigationLock: Hook to prevent navigation out of child space
 */

export { ParentPINGate } from './ParentPINGate';
export { ChildSwitchModal } from './ChildSwitchModal';
export { ChildSpaceHeader } from './ChildSpaceHeader';
export { PINGateHeaderButton } from './PINGateHeaderButton';
export {
  useChildNavigationLock,
  childSpaceScreenOptions,
  childSpaceEntryOptions,
  parentSpaceEntryOptions,
} from '@/src/hooks/useChildNavigationLock';
