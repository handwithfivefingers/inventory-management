import { zodResolver } from "@hookform/resolvers/zod";
import { ActionFunctionArgs, LoaderFunctionArgs, data } from "@remix-run/node";
import { Link, useFetcher } from "@remix-run/react";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { redirect } from "react-router";
import { authenticator } from "~/action.server/auth.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { loginSchema } from "~/constants/schema/login";
import { cn } from "~/libs/utils";
import { commitSession, getSession } from "~/sessions";
import styles from "./styles.module.scss";
export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get("cookie"));
  let token = session.get("token");
  if (token) throw redirect("/");
  return data(null);
}

function Login() {
  const fetcher = useFetcher<{ status: boolean; message?: string; data: any }>({ key: "login" });
  const formMethods = useForm({
    defaultValues: {
      email: "handgod1995@gmail.com",
      password: "123456",
    },
    resolver: zodResolver(loginSchema),
  });
  const onError = (errors: any) => {
    console.log("errors", errors);
  };
  useEffect(() => {
    if (fetcher.state === "loading" && fetcher.data) {
      toast.danger({ message: fetcher.data.message });
      fetcher.data = undefined;
    }
  }, [fetcher.data?.message]);

  return (
    <div className="w-full flex flex-col p-4 gap-4 items-center justify-center">
      <CardItem title="Đăng nhập" className={cn("p-4 flex-col gap-2 shadow-xl", styles.box)}>
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(
              (v) => fetcher.submit(v, { method: "POST", action: "/login" }),
              (e) => onError(e)
            )}
            action="/login"
            method="POST"
            className="flex flex-col gap-2"
          >
            <Controller
              control={formMethods.control}
              name="email"
              render={({ field }) => (
                <TextInput label="Email" {...field} onChange={(e: any) => field.onChange(e.target?.value)} />
              )}
            />
            <Controller
              control={formMethods.control}
              name="password"
              render={({ field }) => (
                <TextInput
                  label="Password"
                  {...field}
                  onChange={(e: any) => field.onChange(e.target?.value)}
                  type="password"
                />
              )}
            />
            <div>
              <div className="text-sm text-right">
                <Link to="/register" className="text-indigo-600">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <TMButton htmlType="submit">Đăng nhập</TMButton>

            <div>
              <div className="text-sm text-center py-2">
                <span>Bạn chưa có tài khoản? </span>
                <Link to="/register" className="text-indigo-600">
                  Đăng kí ngay
                </Link>
              </div>
            </div>
            <div className="flex items-center flex-row">
              <div className="bg-indigo-600 h-0.5 w-full" />
              <span className="text-center text-sm flex-shrink-0 px-4">Đăng nhập với</span>
              <div className="bg-indigo-600 h-0.5 w-full" />
            </div>
            <div className="flex flex-row justify-center gap-8">
              <div className="p-2 rounded-md bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-all">
                <Icon name="facebook" className="text-indigo-600" />
              </div>
              <div className="p-2 rounded-md bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-all">
                <Icon name="instagram" className="text-indigo-600" />
              </div>
              <div className="p-2 rounded-md bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-all">
                <Icon name="mail" className="text-indigo-600 " />
              </div>
            </div>
          </form>
        </FormProvider>
      </CardItem>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  let resp = await authenticator.authenticate("session", request);
  if (resp.status === 400) {
    return {
      message: resp.error,
      status: 400,
    };
  }
  let session = await getSession(request.headers.get("cookie"));
  session.set("token", resp.token);
  session.set("user", resp.data);
  return redirect("/", {
    status: 301,
    headers: { "Set-Cookie": await commitSession(session) },
  });
};
export default Login;
