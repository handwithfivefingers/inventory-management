export interface IResponse<T> {
  data?: T;
  count?: number;
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
  get = async <T>(params: IGetParams, options?: Record<string, string>): Promise<IResponse<T | undefined>> => {
    try {
      const response = await fetch(this.BASE_URL + params, {
        headers: { ...this.headers, ...options },
        signal: AbortSignal.timeout(30000),
        credentials: "include",
        method: "GET",
      });
      const resp = await response?.json();
      if (response.status !== 200) throw { message: resp.error, status: response.status };
      if (!resp) return { data: undefined } as IResponse<undefined>;
      return { data: resp?.data || resp, status: response.status, count: resp?.count };
    } catch (error) {
      throw {
        message:
          "message" in (error as Record<string, string>)
            ? (error as Record<string, string>).message
            : error?.toString(),
        status: 400,
      };
    }
  };

  post = async <R, T>(apiPath: string, params?: T, options?: Record<string, string>): Promise<IResponse<R>> => {
    try {
      const response = await fetch(this.BASE_URL + apiPath, {
        headers: { ...this.headers, ...options },
        signal: AbortSignal.timeout(30000),
        credentials: "include",
        method: "POST",
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (response.status !== 200) throw data.message;
      return { data: data, status: response.status };
    } catch (error) {
      throw { error: error, message: error?.toString(), status: 400 };
    }
  };
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

export { HTTPService };
