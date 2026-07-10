/*
 * savings-badge.js — connects the "savings-badge" block to HAL's SavingsBadge.
 * The array is the field names IN ORDER (must match component-definition.json).
 */
import { renderBlock } from '../_react/block.js';

export default (block) => renderBlock(block, 'SavingsBadge', ['text']);
