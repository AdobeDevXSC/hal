# hal AEM Edge Functions

A Fastly Compute edge function for the **hal** Edge Delivery site, scaffolded
from the AEM Edge Functions boilerplate. It uses **folder mapping**: the page is authored once at
`/en/find-a-cruise/default` (DA: `/adobedevxsc/hal/en/find-a-cruise/default`)
and the handler (`src/find-a-cruise-handler.js`) renders that shell for every
`/en/find-a-cruise/<id>` URL, injecting per-id content — replace the boilerplate
injection with real logic.

Function source is under `./src`, tests under `./test` (run with `mocha`).
Service provisioning is defined in `../config/edgeFunctions.yaml` and CDN routing
in `../config/cdn.yaml`.

## How it runs (read this first)

- The function only runs on the **custom site domain** wired via
  `../config/cdn.yaml` (the CDN origin-selector). It does **not** run on the
  shared `*.aem.live` / `*.aem.page` hosts — those serve the normal EDS page.
- **Provisioning ≠ code deploy.** The function is *created* by the Cloud Manager
  **Edge Delivery configuration pipeline** reading `/config` (edgeFunctions.yaml +
  cdn.yaml) from the repo's `main` branch. `aio aem edge-functions deploy <name>`
  only uploads code and fails "Edge Function not found" until the pipeline runs.

## Setup

```
npm install -g @adobe/aio-cli
aio plugins:install @adobe/aio-cli-plugin-aem-edge-functions
aio login
aio aem edge-functions setup   # select the Sandbox 1 org + program; populates .aio
```

## Local development

```
npm install
npm run build     # compiles ./src/index.js → ./bin/main.wasm
fastly compute serve   # local runtime on :7676 (proxies non-demo paths to :3000)
```

Run `aem up` (the EDS dev server on :3000) alongside `fastly compute serve` so
the proxied shell requests resolve, then hit
`http://localhost:7676/en/find-a-cruise/anything`.

Or navigate to cd .../hal/aem-edge-functions and then run `aio aem edge-functions serve`.
Then open up `http://localhost:7676/en/find-a-cruise/anything`.

## Deploy (after the config pipeline has provisioned the function)

```
aio aem edge-functions deploy hal-edge-function
```
