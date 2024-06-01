# React Distributed Components

Effortlessly compose client and server components.

## Introduction

The goal of this library is to enable rendering server components declaratively from client components, using familiar component composition, and in a way that is router-agnostic.

> [!NOTE]
> This package currently depends on the **react-server-dom-webpack** package. You must provide a manifest that is compatible with that package. If you're using Webpack, then you can use the Webpack plugin. If you are not using Webpack, then you probably want to wait for these APIs to mature and not be dependent on a specific module bundler.

React allows composing client and server components, but only if the current component is a server component. In other words, you cannot render a server component in a client component. In addition, if you pass a server component as a prop to a client component, then React will eagerly render that component. React must render the server component in case the client component is mounted. However, there is no guarantee that the client component will be mounted.

Consider the following example:

```jsx
const ServerRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
  </Routes>
);
```

If the `<Route />` component is a client component and the `<Home />` and `<About />` components are server components, then both the `<Home />` and `<About />` components will be rendered on the server. React will skip rendering the `<Route />` component because it is a client component and eagerly render the `<Home />` and `<About />` components because they are passed as props to the client component.

Furthermore, server components are inert. They render once on the server and only on the server, and they do not react to state changes. Because of this, Meta-frameworks have decided to tightly couple server components to a router. However, it is not strictly necessary to couple server components to a router. It is possible to devise an API for rerendering server components when their props change on the client.

This library attempts to solve these issues; specifically, it allows you to:

- Render server components declaratively in client components.
- Render server components only when they are mounted.
- Rerender server components when their props change on the client.
- Cache server components on the client so that they may be unmounted and remounted without a round trip to the server.

I believe that this may provide a path for incremental adoption of server components, where it makes sense, for existing React apps.

## Getting Started

To get started, install the package from the npm registry.

```
npm add react-distributed-components
```

> [!WARNING]
> This package is experimental. I provide no warranties. Use at your own risk, and expect breaking changes.

To render a server component from a client component, use a `<ServerComponent />`. For example:

```tsx
import { ServerComponent } from "react-distributed-components";

type HomePage = (typeof import("./HomePage.js"))["HomePage"];

const HomePage = () => (
  <ServerComponent<HomePage>
    suspense={{ fallback: "loading home page" }}
    type="HomePage"
  />
);
```

In this example, I have created a `<HomePage />` client component that acts as a proxy to the `<HomePage />` server component. When the `<HomePage />` client component is mounted, it will make a request to the server to render the `<HomePage />` server component.

In order to know which endpoint to call and how to render the RSC payload, some additional context is required.

```tsx
import {
  ServerComponent,
  ServerComponentContext,
} from "react-distributed-components";

import ssrManifest from "./ssrManifest.json" with { type: "json" };
import { callServer } from "./callServer.js";

type HomePage = (typeof import("./HomePage.js"))["HomePage"];

const HomePage = () => (
  <ServerComponent<HomePage>
    suspense={{ fallback: "loading home page" }}
    type="HomePage"
  />
);

const App: FC<{ url: string }> = ({ url }) => {
  const { origin } = new URL(url);

  return (
    <ServerComponentContext
      value={{
        callServer,
        endpoint: `${origin}/render`,
        ssrManifest,
      }}
    >
      <HomePage />
    </ServerComponentContext>
  );
};
```

This package currently depends on the **react-server-dom-webpack** package. You must implement the `CallServerCallback` and provide a manifest that is compatible with that package.

Finally, the `/render` HTTP endpoint needs to be implemented to render the server component. Here is an example using Hono:

```ts
import { type Context, type Next, Hono } from "hono";
import { PassThrough, Readable } from "node:stream";
import {
  decodeReply,
  renderToPipeableStream,
} from "react-server-dom-webpack/server";

import clientManifest from "./clientManifest.json" with { type: "json" };
import { HomePage } from "./HomePage.js";

app.post("/render", renderServerComponent);

async function renderServerComponent(context: Context, _next: Next) {
  type Body =
    | { type: "HomePage"; props: HomePage.Props };

  const body = await decodeReply<Body>(await context.req.text());
  const { type, props } = body;

  const Component = () => {
    switch (type) {
      case "HomePage":
        return <HomePage {...props} />;
    }
  };

  const { pipe } = renderToPipeableStream(<Component />, manifest);
  const rscPayload = pipe(new PassThrough());

  return context.newResponse(Readable.toWeb(rscPayload) as ReadableStream);
}
```

The client component is going to make a `POST` request to the server. The body of the request will contain the component type and props. The endpoint is expected to respond with the RSC payload.

## API

### ServerComponent

<sup>_Client Component_</sup>

```ts
type ServerComponent = <T extends ComponentType<any>>(props: {
  /**
   * Props to be forwarded to the server component.
   */
  props?: ComponentProps<T>;
  /**
   * Optionally provide a fallback while the server component is loading.
   */
  suspense?: SuspenseProps;
  /**
   * Identifies the type of the server component. The server will use this value
   * to know which server component to render.
   */
  type: string;
}) => ReactNode;
```

A `ServerComponent` is a client component that acts as a proxy for a server component.

#### Example

```tsx
import { ServerComponent } from "react-distributed-components";

type HomePage = (typeof import("./HomePage.js"))["HomePage"];

const HomePage = () => (
  <ServerComponent<HomePage>
    suspense={{ fallback: "loading home page" }}
    type="HomePage"
  />
);
```

### Context

<sup>_Type_</sup>

```ts
type Context = {
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
```

A `ServerComponent` requires context to know which endpoint to call and how to render the RSC payload.

### ServerComponentContext

<sup>_Client Component_</sup>

```ts
type ServerComponentContext = React.Provider<Context>;
```

A `ServerComponentContext` is used to provide context to a `ServerComponent`.

#### Example

```tsx
import { ServerComponentContext } from "react-distributed-components";

import ssrManifest from "./ssrManifest.json" with { type: "json" };
import { callServer } from "./callServer.js";

const App: FC<{ url: string }> = ({ url }) => {
  const { origin } = new URL(url);

  return (
    <ServerComponentContext
      value={{
        cache: new Map(),
        callServer,
        endpoint: `${origin}/render`,
        ssrManifest,
      }}
    >
      {/* children */}
    </ServerComponentContext>
  );
};
```
