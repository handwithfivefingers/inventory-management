# RemixJS Route Standard Template

> Purpose: Define consistent structure and best practices for Remix
> route files.

------------------------------------------------------------------------

# 📁 Route File Structure

Each route file should follow this order:

1.  Imports
2.  Loader
3.  Action (if needed)
4.  Component (default export)
5.  ErrorBoundary (optional)
6.  CatchBoundary (optional)
7.  Helper functions (server-only at bottom)

------------------------------------------------------------------------

# 1️⃣ Loader (Read-Only Data Fetching)

## Rules

-   Must be async
-   Must return json() or redirect()
-   No mutation logic
-   Validate params
-   Handle errors properly
-   Never trust external API responses blindly

## Template

``` ts
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request, params }) => {
  try {
    if (!params.id) {
      throw new Response("Not Found", { status: 404 });
    }

    const data = await getData(params.id);

    return json(data);

  } catch (error) {
    throw new Response("Server Error", { status: 500 });
  }
};
```

------------------------------------------------------------------------

# 2️⃣ Action (Mutations Only)

## Rules

-   Must be async
-   Only handle POST / PUT / DELETE
-   Validate all form inputs
-   Never parse cookies manually
-   Use session utilities
-   Return json() or redirect()
-   Always handle JSON parsing errors

## Template

``` ts
import { json } from "@remix-run/node";
import { getSession } from "~/sessions.server";

export const action = async ({ request }) => {
  const session = await getSession(
    request.headers.get("Cookie")
  );

  const token = session.get("token");

  if (!token) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const raw = formData.get("data");

  if (!raw) {
    return json({ error: "Missing data" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const response = await callAPI(parsed, token);

  return json(response);
};
```

------------------------------------------------------------------------

# 3️⃣ Route Component (UI Layer)

## Rules

-   No server logic
-   No direct cookie access
-   No direct database access
-   Keep component pure
-   Use useLoaderData`<typeof loader>`{=html}() for type safety

## Template

``` tsx
export default function RouteComponent() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      {/* Render UI only */}
    </div>
  );
}
```

------------------------------------------------------------------------

# 4️⃣ Error Handling

## Throwing Errors (Server Side)

``` ts
throw new Response("Not Found", { status: 404 });
```

## Returning Errors

``` ts
return json({ error: "Invalid input" }, { status: 400 });
```

## Error Boundary

``` tsx
export function ErrorBoundary() {
  return <div>Something went wrong.</div>;
}
```

------------------------------------------------------------------------

# 5️⃣ Data Flow Overview

Browser ↓ Form / Fetcher ↓ action() ↓ Return json() / redirect() ↓
Revalidation ↓ loader() ↓ Component re-render

------------------------------------------------------------------------

# 6️⃣ Security Checklist

-   [ ] Validate params
-   [ ] Validate form input
-   [ ] Handle JSON parsing errors
-   [ ] Check session existence
-   [ ] Never expose token to client
-   [ ] Never mutate data inside loader
-   [ ] Use json() wrapper
-   [ ] Handle external API failures

------------------------------------------------------------------------

# 7️⃣ Naming Convention

-   RouteComponent
-   loader
-   action
-   ErrorBoundary
-   getData() → server helper
-   callAPI() → external service

------------------------------------------------------------------------

# 8️⃣ Anti-Patterns (Do NOT Do)

❌ Access request.cookies() directly\
❌ Fetch inside component when loader exists\
❌ Mutate inside loader\
❌ Skip validation\
❌ Return raw object without json()\
❌ Trust client JSON without parsing safely

------------------------------------------------------------------------

# 🔟 Final Rule

Understand server/client boundaries clearly.\
Loader = Read.\
Action = Write.\
Component = Render.
