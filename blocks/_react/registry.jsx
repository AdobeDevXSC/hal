/*
 * registry.jsx — the menu of HAL components an author is allowed to place on a page.
 *
 * Each line maps a name (e.g. "Button") to the real component from HAL's shared
 * design system (@hal-sbn-root/shared-ui). A block looks its component up here by
 * name. To offer a new component: import it and add one line.
 *
 * Keep this list small — everything listed here gets compiled into the shared
 * bundle (react-runtime.js), so unused entries only make that file heavier.
 */
import {
  Button,
  Headline,
  SavingsBadge,
  FareCardDetails,
} from '@hal-sbn-root/shared-ui';

export const registry = {
  Button,
  Headline,
  SavingsBadge,
  FareCardDetails,
};
