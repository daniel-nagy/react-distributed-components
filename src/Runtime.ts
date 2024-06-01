import type { ReactNode, Thenable } from "react";
import type { Options as BrowserOptions } from "react-server-dom-webpack/client.browser";
import type {
  Options as NodeOptions,
  SSRManifest,
} from "react-server-dom-webpack/client.node";

/*
 * The `Runtime` protocol must be implemented for each supported runtime.
 */

export type Options = (BrowserOptions & NodeOptions) & {
  ssrManifest?: SSRManifest;
};

/**
 * Reads the RSC payload from the document so that the component can be hydrated
 * on the client without refetching the RSC payload from the server.
 */
export type getRscPayloadFromDocument = (
  key: string
) => ReadableStream<Uint8Array> | null;

/**
 * Transforms the RSC payload into React nodes that can be rendered on the
 * client.
 */
export type render = (
  rscPayload: ReadableStream<Uint8Array>,
  options?: Options
) => Thenable<ReactNode>;
