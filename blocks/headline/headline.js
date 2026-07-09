// EDS block entry — auto-loaded for any block named "headline". Mounts the shared-ui
// <Headline> as a React island. Flow: ../_react/block.js → parse.js → runtime.jsx · Map: ../../POC-GUIDE.md
import { renderBlock } from '../_react/block.js';

export default (block) => renderBlock(block, 'Headline');
