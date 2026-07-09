// Which shared-ui components are exposed as EDS blocks.
// Add a component here + a 2-line block folder → it's authorable as a block.
import {
  Button,
  Headline,
  SavingsBadge,
  FareCardDetails,
  ChooseYourFare,
} from '@hal-sbn-root/shared-ui';

export const registry = {
  Button, // atom
  Headline, // atom
  SavingsBadge, // molecule
  FareCardDetails, // organism (card)
  ChooseYourFare, // template
};
