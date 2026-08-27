import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@remix-run/react";
import { FormProvider, useForm } from "react-hook-form";
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "react-router";
import { AuthService } from "~/action.client/auth.service";
import { CardItem } from "~/components/card-item";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { ILoginForm, loginSchema } from "~/constants/schema/login";
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http";
import { cn } from "~/libs/utils";
import { commitSession, getSession, parseCookieFromRequest } from "~/sessions";
import { IUser } from "~/types/user";
import styles from "./styles.module.scss";

export async function loader({ request }: LoaderFunctionArgs) {
  const { token, userId } = await parseCookieFromRequest(request);
  if (token && userId) throw redirect("/");
  return {};
}

function Login() {
  const formMethods = useForm<ILoginForm>({
    defaultValues: {
      email: "handgod1995@gmail.com",
      password: "123456",
    },
    resolver: zodResolver(loginSchema),
  });
  const { submit, isLoading } = useSubmitPromise();
  const onError = (errors: any) => {
    console.log("errors", errors);
  };

  const handleSubmit = async (v: ILoginForm) => {
    try {
      const resp = await submit<{ data: IUser }>({ data: JSON.stringify(v) }, { method: "POST" });
      const user = resp.data;
      console.log("user", user);
      if (!user) {
        toast.danger({
          title: "Đăng nhập thất bại",
          message: "Không có dữ liệu phản hồi",
        });
        return;
      }
    } catch (error) {
      const err = error as ResponseError;
      toast.danger({
        title: "Đăng nhập thất bại",
        message: err?.message || "Có lỗi xảy ra, vui lòng thử lại",
      });
    }
  };

  return (
    <div className="w-full flex flex-col p-4 gap-4 items-center justify-center h-screen">
      <CardItem
        title="Đăng nhập"
        className={cn("p-4 flex-col gap-2 shadow-xl mx-auto max-w-[400px] w-full flex", styles.box)}
      >
        <FormProvider {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(handleSubmit)} className="flex flex-col gap-2">
            <FormControl name="email">
              {(field) => <TextInput label="Email" {...field} onChange={(e: any) => field.onChange(e.target?.value)} />}
            </FormControl>
            <FormControl name="password">
              {(field) => (
                <TextInput
                  label="Mật khẩu"
                  {...field}
                  onChange={(e: any) => field.onChange(e.target?.value)}
                  type="password"
                />
              )}
            </FormControl>

            <TMButton htmlType="submit" loading={isLoading} disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </TMButton>

            <div>
              <div className="text-sm text-center py-2">
                <span>Bạn chưa có tài khoản? </span>
                <Link to="/auth/register" className="text-indigo-600 dark:text-white underline underline-offset-2">
                  Đăng kí ngay
                </Link>
              </div>
            </div>
          </form>
        </FormProvider>
      </CardItem>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const data = await request.formData();
    const json = JSON.parse(data.get("data") as string);
    const resp = await AuthService.login(json);
    if (resp.status !== 200) throw resp;
    console.log("resp", resp);
    const session = await getSession(request.headers.get("cookie"));
    const loginData = resp.data?.data as IUser & {
      token?: string;
      defaultVendorId?: number | null;
      defaultWarehouseId?: number | null;
    };
    const { token, ...user } = loginData || ({ id: "" } as unknown as typeof loginData);
    session.set("token", token as string);
    session.set("userId", user?.id);
    // Seed the active vendor/warehouse immediately. The first document request
    // after login runs the layout and page loaders in parallel against this
    // cookie, so it must already carry a consistent selection — otherwise data
    // is fetched without a warehouseId and falls back to an arbitrary one.
    if (!session.get("vendorId") && user?.defaultVendorId) {
      session.set("vendorId", user.defaultVendorId);
    }
    if (!session.get("warehouseId") && user?.defaultWarehouseId) {
      session.set("warehouseId", user.defaultWarehouseId);
    }
    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    console.log("error", error);
    return {
      message: ((error as any)?.error as any)?.error as string,
    };
  }
};

export default Login;
