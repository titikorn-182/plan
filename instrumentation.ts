import type { Instrumentation } from "next";
import { reportServerError } from "@/lib/observability/server-logger";

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const pathname = request.path.split("?", 1)[0] ?? "/";
  reportServerError("next_request", error, {
    method: request.method,
    pathname,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
