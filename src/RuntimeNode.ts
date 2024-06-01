/// <reference types="node" />

import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import type { ReactNode } from "react";
import { createFromNodeStream } from "react-server-dom-webpack/client.node";

import type * as Runtime from "./Runtime.js";

/**
 * This is a noop since the component cannot be hydrated in a Node runtime.
 */
export const getRscPayloadFromDocument: Runtime.getRscPayloadFromDocument = (
  _key
) => null;

/**
 * Transforms the RSC payload into React nodes that can be rendered on the
 * client.
 */
export const render: Runtime.render = (
  rscPayload,
  { ssrManifest, ...options } = {}
) => {
  return createFromNodeStream<ReactNode>(
    Readable.fromWeb(rscPayload as ReadableStream),
    ssrManifest!,
    options
  );
};
