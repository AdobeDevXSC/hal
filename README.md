# Holland America Line — AEM Edge Delivery Services

The Holland America Line website built on Adobe Experience Manager Edge Delivery Services (EDS). Content is authored in Document Authoring (DA); the codebase carries the Holland America brand system and a library of reusable blocks.

## 📖 Getting Started Guide

A developer & author guide — the initiative summary, where the code and content live, how to find the GitHub repo and DA folder, and how to run locally — is published via GitHub Pages:

**https://adobedevxsc.github.io/hal/**

Source: [`docs/index.html`](docs/index.html)

## Environments

- Preview: https://main--hal--AdobeDevXSC.aem.page/
- Live: https://main--hal--AdobeDevXSC.aem.live/
- Content (DA): https://da.live/#/AdobeDevXSC/hal

## Documentation

For background on AEM Edge Delivery Services, see https://www.aem.live/docs/ and specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)
5. [AEM Block Collection](https://www.aem.live/developer/block-collection#block-collection-1)

Project-specific coding standards and the publishing workflow live in [AGENTS.md](AGENTS.md).

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the project directory in your favorite IDE and start coding :)
