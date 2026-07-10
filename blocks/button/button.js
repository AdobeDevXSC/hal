/*
 * button.js — connects the "button" block to HAL's Button component.
 * Every shared-ui block is these same two lines with a different component name.
 * (Edge Delivery loads this automatically for any block named "button".)
 */
import { renderBlock } from '../_react/block.js';

export default (block) => renderBlock(block, 'Button');
