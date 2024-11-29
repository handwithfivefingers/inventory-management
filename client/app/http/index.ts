export interface IGetParams {
  basePath?: string;
  headers: Record<string, any>;
}
export interface IHTTPService {
  basePath: string;
  token?: string;
}
type IData<T> = T;

class HTTPService {
  options = {
    basePath: "",
  };
  headers = new Headers({
    Accept: "application/json",
  });

  constructor(props: IHTTPService) {
    this.options = {
      basePath: props?.basePath,
    };

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
    };
    return fetch(url, { method: "GET", ...options }).then((res) => res.json());
  }
  post(path?: string, data: IData<any> = {}, paramsOptions?: IGetParams) {
    const url = paramsOptions?.basePath ? paramsOptions?.basePath : this.options.basePath + path;
    const headers = this.headers;
    const options = {
      headers: paramsOptions?.headers ? paramsOptions?.headers : headers,
      method: "POST",
      body: JSON.stringify(data),
    };
    console.log("options", options);
    return fetch(url, options).then((res) => res.json());
  }
}

const http = new HTTPService({ basePath: "http://localhost:1337/api" });

export { http };
