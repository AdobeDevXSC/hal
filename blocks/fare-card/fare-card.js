/*
 * fare-card.js — connects the "fare-card" block to HAL's FareCardDetails.
 * The array is the field names IN ORDER (must match component-definition.json).
 */
import { renderBlock } from '../_react/block.js';

export default (block) => renderBlock(block, 'FareCardDetails', ['title', 'price', 'ctaLabel']);
