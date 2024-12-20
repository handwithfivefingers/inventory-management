export interface IGetParams {
  basePath?: string;
  headers: Record<string, any>;
  credentials?: string;
  stringable?: boolean;
}
export interface IHTTPService {
  basePath: string;
  token?: string;
  credentials?: string;
}
type IData<T> = T;

class HTTPService {
  options = {
    basePath: "",
    credentials: "same-origin",
  };
  headers = new Headers({
    Accept: "application/json",
  });

  constructor(props: IHTTPService) {
    this.options.basePath = props.basePath;

    if (props.token) {
      this.headers.set("Authorization", `Bearer ${props.token}`);
    }
    this.headers.append("Accept-Language", "en,vi-VN;q=0.9,vi;q=0.8,en-US;q=0.7,ja;q=0.6");
    this.headers.append("Content-Type", "application/json");
  }

  setHeader(key: string, value: string) {
    this.headers.set(key, value);
  }
  removeHeader(key: string) {
    this.headers.delete(key);
  }
  setToken(token: string) {
    this.headers.set("Authorization", `Bearer ${token}`);
  }
  async get(path?: string, paramsOptions?: IGetParams) {
    try {
      const url = paramsOptions?.basePath ? paramsOptions?.basePath : this.options.basePath + path;
      const headers = this.headers;
      const options = {
        headers: paramsOptions?.headers ? paramsOptions?.headers : headers,
        credentials: this.options.credentials,
      };
      const resp = await fetch(url, { method: "GET", ...(options as any) });
      console.log(`GET ---> ${url} :::: STATUS:`, resp.status);
      const data = await resp.json();
      if (resp.status !== 200) throw data;
      return data;
    } catch (error) {
      throw error;
    }
  }
  async post(path?: string, data: IData<any> = {}, paramsOptions?: IGetParams, stringable = true) {
    try {
      const url = paramsOptions?.basePath ? paramsOptions?.basePath : this.options.basePath + path;
      const headers = this.headers;
      const newHeaders = new Headers(headers);
      if (paramsOptions?.headers) {
        for (let key in paramsOptions.headers) {
          newHeaders.set(key, paramsOptions.headers[key]);
        }
      }
      const options = {
        headers: newHeaders,
        method: "POST",
        body: stringable ? JSON.stringify(data) : data,
        credentials: this.options.credentials,
      };
      const resp = await fetch(url, options as any);
      console.log(`POST ---> ${url} :::: STATUS:`, resp.status);
      const dataJson = await resp.json();
      if (resp.status !== 200) throw dataJson;
      return { status: resp.status, ...dataJson };
    } catch (error: any) {
      throw { error: error, status: error?.status || 400 };
    }
    // return fetch(url, options as any)
    //   .then(async (res) => {
    //     const json = await res.json();
    //     return { status: res.status, ...json };
    //   })
    //   .catch((err) => ({ error: err, status: err.status }));
  }
}

const http = new HTTPService({ basePath: "http://localhost:3001/api" });

export { http };
