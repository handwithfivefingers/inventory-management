export interface IGetParams {
  basePath?: string;
  headers: Record<string, any>;
}
export interface IHTTPService {
  basePath: string;
  token?: string;
}
class HTTPService {
  options = {
    basePath: "",
  };
  headers = new Headers();
  constructor(props: IHTTPService) {
    this.options = {
      basePath: props?.basePath,
    };
    if (props.token) {
      this.headers.set("Authorization", `Bearer ${props.token}`);
    }
  }
  get(path?: string, paramsOptions?: IGetParams) {
    const url = paramsOptions?.basePath ? paramsOptions?.basePath : this.options.basePath + path;
    const headers = this.headers;
    const options = {
      headers: paramsOptions?.headers ? paramsOptions?.headers : headers,
    };
    return fetch(url, { method: "GET", ...options });
  }
}

const http = new HTTPService({ basePath: "http://localhost:1337/api" });

export { http };
