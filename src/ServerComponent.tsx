"use client";

import {
  type ComponentProps,
  type ComponentType,
  type FC,
  type ReactNode,
  type SuspenseProps as ReactSuspenseProps,
  Suspense,
  startTransition,
  use,
  useEffect,
  useRef,
  useState,
} from "react";
import { encodeReply } from "react-server-dom-webpack/client.browser";

import { getRscPayloadFromDocument, render } from "#Runtime.js";
import type { HasRequiredKeys } from "./Object.js";
import { useServerComponentContext } from "./ServerComponentContext.js";
import { Uint8ArraySink } from "./Uint8ArraySink.js";

type SuspenseProps = Omit<ReactSuspenseProps, "children">;

export namespace ServerComponent {
  type WithComponentProps<T extends ComponentType> =
    HasRequiredKeys<ComponentProps<T>> extends true
      ? {
          /**
           * Props to be forwarded to the server component.
           */
          props: ComponentProps<T>;
        }
      : { props?: ComponentProps<T> };

  export type Props<T extends ComponentType> = WithComponentProps<T> & {
    /**
     * Optionally provide a fallback while the server component is loading.
     */
    suspense?: SuspenseProps;
    /**
     * Identifies the type of the server component. The server will use this value
     * to know which server component to render.
     */
    type: string;
  };
}

/**
 * Renders a server component on the client. An HTTP POST request will be made
 * to the configured endpoint whenever the component's props change.
 *
 * The payload sent to the server will contain the `type` and `props` passed to
 * this component. The server must render the component and respond with the RSC
 * payload.
 *
 * The RSC payload will be cached in memory on the client. The cache is keyed
 * by the props. This prevents rerendering the server component if it is
 * unmounted and remounted. This enables immediate navigation to a previously
 * rendered server component without rerendering it on the server.
 *
 * This component uses React's Suspense API. You may provide a suspense fallback
 * to display a loading state while the component is rendering.
 */
export const ServerComponent =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T extends ComponentType<any>>({
    props,
    suspense,
    type,
  }: ServerComponent.Props<T>): ReactNode => {
    const { cache, callServer, endpoint, ssrManifest } =
      useServerComponentContext();

    const getRscPayloadFromCache = (
      key: string
    ): ReadableStream<Uint8Array> | null => {
      return cache.has(key) ? new Response(cache.get(key)).body : null;
    };

    const getPromise = async (type: string, props?: ComponentProps<T>) => {
      const body = (await encodeReply({ type, props })) as string;
      const key = body;
      let responseBody: ReadableStream<Uint8Array> | null | undefined;

      responseBody = getRscPayloadFromCache(key);
      responseBody ??= getRscPayloadFromDocument(key);
      responseBody ??= (await fetch(endpoint, { body, method: "POST" })).body!;

      const [left, right] = responseBody.tee();
      const sink = new Uint8ArraySink();

      left.pipeTo(sink);

      const content = await render(right, { callServer, ssrManifest });
      cache.set(body, sink.data);

      return {
        content,
        key,
        rscPayload: sink.data,
      };
    };

    const [promise, setPromise] = useState(() => getPromise(type, props));
    const didMount = useRef(false);

    useEffect(() => {
      if (!didMount.current) return void (didMount.current = true);

      startTransition(() => {
        setPromise(getPromise(type, props));
      });
    }, [type, props]);

    return (
      <Suspense {...suspense}>
        <Async promise={promise} />
      </Suspense>
    );
  };

const Async: FC<{
  promise: Promise<{
    content: ReactNode;
    key: string;
    rscPayload: Uint8Array;
  }>;
}> = ({ promise }) => {
  const { content, key, rscPayload } = use(promise);

  return (
    <>
      {content}
      <script id={key} type="json">
        {JSON.stringify([...rscPayload])}
      </script>
    </>
  );
};
