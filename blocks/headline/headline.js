/*
 * headline.js — connects the "headline" block to HAL's Headline component.
 * The array is the field names IN ORDER (must match component-definition.json).
 */
import { renderBlock } from '../_react/block.js';

export default (block) => renderBlock(block, 'Headline', ['children']);
