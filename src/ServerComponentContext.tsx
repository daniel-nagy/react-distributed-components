"use client";

import { createContext, use } from "react";
import type { CallServerCallback } from "react-server-dom-webpack/client.browser";
import type { SSRManifest } from "react-server-dom-webpack/client.node";

export type Context = {
  /**
   * An in-memory RSC payload cache keyed by component props.
   */
  cache: Map<string, Uint8Array>;
  /**
   * Forwarded to react-server-dom-webpack.
   */
  callServer?: CallServerCallback;
  /**
   * The endpoint that renders the server component. The type and props will be
   * in the POST body.
   */
  endpoint: string;
  /**
   * Forwarded to react-server-dom-webpack.
   */
  ssrManifest?: SSRManifest;
};

const ServerComponentContext = createContext<Context>({
  cache: new Map(),
  endpoint: "",
});

/*
 * A wrapper around ServerComponentContext.Provider. This is necessary to make
 * it a client component. Otherwise, rendering it in a server component will
 * error.
 */
const Provider = (({ value, ...props }) => {
  const parentContext = useServerComponentContext();

  return (
    <ServerComponentContext.Provider
      value={{ ...parentContext, ...value }}
      {...props}
    />
  );
}) as typeof ServerComponentContext.Provider;

export { Provider as ServerComponentContext };

export const useServerComponentContext = () => use(ServerComponentContext);
