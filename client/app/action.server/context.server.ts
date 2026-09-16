import { Session } from "@remix-run/node";
import { AsyncLocalStorage } from "async_hooks";
import { parseCookieFromRequest } from "~/sessions";
import type { LoaderFunctionArgs as RemixLoaderArgs } from "@remix-run/node";

export interface IRequestContext {
  cookie?: string;
  vendorId?: string | number;
  warehouseId?: string | number;
  session?: Session;
  userId?: string | number;
}
// Gộp chung AppContext của Remix với Custom Context của bạn
export interface LoaderArgs extends Omit<RemixLoaderArgs, "context"> {
  context: IRequestContext;
}

export const requestStorage = new AsyncLocalStorage<IRequestContext>();

export async function withContext<T>(
  request: Request,
  callback: ({ vendorId, warehouseId, cookie, userId, session }: IRequestContext) => Promise<T>,
): Promise<T> {
  const store = requestStorage.getStore();
  if (store) return callback(store); // Nếu đã có context (từ entry.server)
  const { vendorId, warehouseId, cookie, userId, session } = await parseCookieFromRequest(request);
  const contextData = {
    session: session || undefined,
    userId: userId || undefined,
    cookie: cookie || undefined,
    vendorId: vendorId || undefined,
    warehouseId: warehouseId || undefined,
  };
  return requestStorage.run(contextData, async () => {
    return await callback(contextData);
  });
}

export function getContext() {
  return requestStorage.getStore();
}

export function updateContext(newData: Partial<IRequestContext>) {
  const store = requestStorage.getStore();
  if (store) {
    // Merge dữ liệu mới vào store hiện tại
    Object.assign(store, newData);
  }
}

export function autoWrapContext(originalFn: Function) {
  return async function (args: RemixLoaderArgs) {
    const store = requestStorage.getStore();
    if (store) return originalFn(args); // Nếu đã có store, chạy luôn

    // Nếu chưa có, tự parse cookie
    const { request } = args;
    const { vendorId, warehouseId, cookie, userId, session } = await parseCookieFromRequest(request);

    const contextData = {
      session,
      userId,
      cookie,
      vendorId: vendorId || undefined,
      warehouseId: warehouseId || undefined,
    };
    args.context = { ...args.context, ...contextData };
    return requestStorage.run(contextData, async () => {
      return await originalFn(args);
    });
  };
}
