import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useRouteError } from "react-router";
import { AuthService } from "~/action.client/auth.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { ILoginForm, loginSchema } from "~/constants/schema/login";
import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";
import { IResponseError, ResponseError } from "~/http";
import { toast } from "~/components/notification";
export async function loader({ request }: LoaderFunctionArgs) {
  return {};
}

function Login({ children }: { children: React.ReactNode }) {
  const formMethods = useForm({
    defaultValues: {
      email: "Harry.Ankunding50@gmail.com",
      password: "123456",
    },
    resolver: zodResolver(loginSchema),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onError = (errors: any) => {
    console.log("errors", errors);
  };
  const handleSubmit = async (v: ILoginForm) => {
    try {
      const resp = await AuthService.login(v);
      console.log("resp", resp);
      window.location.href = "/";
    } catch (error) {
      console.log("error", error);
      const err = error as ResponseError;
      toast.danger({ title: "Login Error", message: err?.message });
    }
  };
  return (
    <div className="w-full flex flex-col p-4 gap-4 items-center justify-center h-screen ">
      <CardItem
        title="Đăng nhập"
        className={cn("p-4 flex-col gap-2 shadow-xl mx-auto max-w-[400px] w-full flex ", styles.box)}
      >
        <FormProvider {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(handleSubmit, (e) => onError(e))} className="flex flex-col gap-2">
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

            {children}

            <div>
              <div className="text-sm text-right">
                <Link to="/register" className="text-indigo-600 dark:text-white underline underline-offset-2">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <TMButton htmlType="submit">Đăng nhập</TMButton>

            <div>
              <div className="text-sm text-center py-2">
                <span>Bạn chưa có tài khoản? </span>
                <Link to="/register" className="text-indigo-600 dark:text-white underline underline-offset-2">
                  Đăng kí ngay
                </Link>
              </div>
            </div>
            <div className="flex items-center flex-row">
              <div className="bg-indigo-600 h-[1px] w-full dark:bg-slate-400" />
              <span className="text-center text-sm flex-shrink-0 px-4">Đăng nhập với</span>
              <div className="bg-indigo-600 h-[1px] w-full dark:bg-slate-400" />
            </div>
            <div className="flex flex-row justify-center gap-8">
              <TMButton className="px-2">
                <Icon name="facebook" />
              </TMButton>
              <TMButton className="px-2">
                <Icon name="instagram" />
              </TMButton>
              <TMButton className="px-2">
                <Icon name="mail" />
              </TMButton>
            </div>
          </form>
        </FormProvider>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  const error: any = useRouteError();
  console.log("error", error);

  if (!import.meta.env.PROD) {
    console.log("error", error);
  }
  return (
    <>
      <Login>
        <div style={{ color: "red" }}>
          <span>{error?.data?.error?.message}</span>
        </div>
      </Login>
    </>
  );
}

// export const action = async ({ request }: ActionFunctionArgs) => {
//   try {
//     const data = await request.formData();
//     const json = JSON.parse(data.get("data") as string);
//     console.log("json", json);
//     const resp = await AuthService.login(json);
//     console.log("resp", resp);
//     if (resp.status !== 200) throw new Error(resp.error);
//     // return Response.json(resp.data, {
//     //   headers: {
//     //     "Set-Cookie": `session=${resp.data?.token as string}`,
//     //   },
//     // });
//     return redirect("/", {
//       headers: {
//         "Set-Cookie": `session=${resp.data?.token as string}`,
//       },
//     });
//   } catch (error) {
//     console.log("error", error);
//     return {
//       message: ((error as any)?.error as any)?.error as string,
//     };
//   }
// };

export default Login;
