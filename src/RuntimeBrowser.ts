/// <reference lib="dom" />

import type { ReactNode } from "react";
import { createFromReadableStream } from "react-server-dom-webpack/client.browser";

import type * as Runtime from "./Runtime.js";

/**
 * Reads the RSC payload from the document so that the component can be hydrated
 * on the client without refetching the RSC payload from the server.
 */
export const getRscPayloadFromDocument: Runtime.getRscPayloadFromDocument = (
  key
) => {
  const data = JSON.parse(document.getElementById(key)?.textContent ?? "null");
  return data && new Response(new Uint8Array(data)).body;
};

/**
 * Transforms the RSC payload into React nodes that can be rendered on the
 * client.
 */
export const render: Runtime.render = (rscPayload, options) => {
  return createFromReadableStream<ReactNode>(rscPayload, options);
};
