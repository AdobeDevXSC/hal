/*
 * button.js — connects the "button" block to HAL's Button component.
 * The array is the field names IN ORDER (must match the row order in
 * component-definition.json). It lets the parser name fields by position when
 * Universal Editor has wiped the name cells in the saved source.
 * Every shared-ui block is this same shape with a different component + fields.
 */
import { renderBlock } from '../_react/block.js';

export default (block) => renderBlock(block, 'Button', ['children', 'variant']);
