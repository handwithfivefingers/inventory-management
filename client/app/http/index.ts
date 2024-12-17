export interface IGetParams {
  basePath?: string;
  headers: Record<string, any>;
  credentials?: string;
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
  get(path?: string, paramsOptions?: IGetParams) {
    const url = paramsOptions?.basePath ? paramsOptions?.basePath : this.options.basePath + path;
    const headers = this.headers;
    const options = {
      headers: paramsOptions?.headers ? paramsOptions?.headers : headers,
      credentials: this.options.credentials,
    };
    return fetch(url, { method: "GET", ...(options as any) }).then((res) => res.json());
  }
  post(path?: string, data: IData<any> = {}, paramsOptions?: IGetParams) {
    const url = paramsOptions?.basePath ? paramsOptions?.basePath : this.options.basePath + path;
    const headers = this.headers;
    const options = {
      headers: paramsOptions?.headers ? paramsOptions?.headers : headers,
      method: "POST",
      body: JSON.stringify(data),
      credentials: this.options.credentials,
    };
    return fetch(url, options as any)
      .then(async (res) => {
        const json = await res.json();
        return { status: res.status, ...json };
      })
      .catch((err) => ({ error: err, status: err.status }));
  }
}

const http = new HTTPService({ basePath: "http://localhost:3001/api" });

export { http };
