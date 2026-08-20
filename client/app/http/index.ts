import { IResponse } from "~/types/common";

export interface IResponseError {
  error?: string;
  status: number;
}

export type IGetParams = string;

export interface IPostParams<T> {
  data: T;
}

export interface IHTTPService {
  BASE_URL?: string;
  cookie?: string;
}

export class ResponseError extends Error {
  status: number;
  constructor(error: { error: string; status: number } | Error) {
    const { error: message, status } = error as { error: string; status: number };
    super(message);
    this.status = status;
    Object.assign(this, error);
  }
}

function logger(target: HTTPService, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const keyName = propertyKey.toUpperCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor.value = async function (...args: any[]) {
    const isProd = typeof import.meta !== "undefined" && import.meta.env?.PROD;
    if (isProd) {
      return originalMethod.apply(this, args);
    }
    const debugLogger = import.meta.env.VITE_DEBUG_LOGGER;
    debugLogger && console.log(`\x1b[33m [Logger] ${keyName} - ${args[0]}`);
    debugLogger && console.log("\x1b[0m");
    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } catch (error) {
      debugLogger && console.error(`\x1b[31m[Logger] Error in ${keyName}:`, JSON.stringify(error, null, 2));
      debugLogger && console.log("\x1b[0m");
      throw error;
    }
  };

  return descriptor;
}

// Export singleton instance for service files

class HTTPService {
  private static instance: HTTPService;
  public headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "en,vi-VN;q=0.9,vi;q=0.8,en-US;q=0.7,ja;q=0.6",
  };
  public BASE_URL = import.meta.env.VITE_API_PATH;
  private constructor(props?: IHTTPService) {
    this.BASE_URL = props?.BASE_URL || import.meta.env.VITE_API_PATH;
  }

  private send = async <T, Body extends {} = never>(url: string, options?: Record<string, string>, body?: Body) => {
    const response: {
      data: T;
      status: number;
      error?: Error;
    } = { data: {} as T, status: 200 };
    try {
      const fetchOptions: RequestInit = {
        headers: { ...this.headers, ...options },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify(body),
        method: options?.method,
        credentials: "include",
      };
      const resp = await fetch(this.BASE_URL + url, fetchOptions);
      const json = await resp.json();
      response.data = json;
      response.status = resp.status;
    } catch (error) {
      response.error = new ResponseError(error as Error);
    } finally {
      return response;
    }
  };

  @logger
  async get<T>(params: IGetParams, options?: Record<string, string>): Promise<IResponse<T | undefined>> {
    return this.send<T>(params, { method: "GET", ...options });
  }

  @logger
  async post<R, T extends {}>(apiPath: string, params?: T, options?: Record<string, string>): Promise<IResponse<R>> {
    return this.send<R, T>(apiPath, { method: "POST", ...options }, params);
  }
  postUpload = async <R>(apiPath: string, params: IPostParams<FormData>): Promise<IResponse<R>> => {
    try {
      const response = await fetch(this.BASE_URL + apiPath, {
        signal: AbortSignal.timeout(30000),
        credentials: "include",
        method: "POST",
        body: params.data,
      });
      const data = await response.json();
      if (response.status !== 200) throw { message: data.message, status: response.status, ...data };
      return { data: data, status: response.status };
    } catch (error) {
      console.log("error", error);
      throw { error: error, message: error?.toString(), status: 400 };
    }
  };
  put = async <R, T>(apiPath: string, params: T, options?: Record<string, string>): Promise<IResponse<R>> => {
    try {
      const response = await fetch(this.BASE_URL + apiPath, {
        headers: { ...this.headers, ...options },
        signal: AbortSignal.timeout(30000),
        credentials: "include",
        method: "PUT",
        body: JSON.stringify(params),
      });
      if (response.status !== 200) throw await response.json();
      return { status: response.status };
    } catch (error) {
      console.log("error", error);
      throw {
        message:
          "message" in (error as Record<string, string>)
            ? (error as Record<string, string>).message
            : error?.toString(),
        status: 400,
      };
    }
  };
  delete = async <R>(apiPath: string, options?: Record<string, string>): Promise<IResponse<R>> => {
    try {
      const response = await fetch(this.BASE_URL + apiPath, {
        headers: { ...this.headers, ...options },
        signal: AbortSignal.timeout(30000),
        credentials: "include",
        method: "DELETE",
      });
      if (response.status !== 200) throw new Error("Delete failed");
      return { status: response.status };
    } catch (error) {
      throw { message: error?.toString(), status: 400 };
    }
  };

  public static getInstance(): HTTPService {
    if (!HTTPService.instance) {
      HTTPService.instance = new HTTPService();
    }
    return HTTPService.instance;
  }
}
export const http = HTTPService.getInstance();
export { HTTPService };
