import { zodResolver } from "@hookform/resolvers/zod";
import { ActionFunctionArgs, LoaderFunctionArgs, data, json } from "@remix-run/node";
import { Link, useFetcher, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { redirect } from "react-router";
import { AuthService } from "~/action.server/auth.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { ERRORS, REGISTER_MESSAGE } from "~/constants/message";
import { registerSchema } from "~/constants/schema/register";
import { cn } from "~/libs/utils";
import { getSession } from "~/sessions";
import { IRegisterParams } from "~/types/authenticate";
import styles from "./styles.module.scss";
export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get("cookie"));
  let token = session.get("token");
  if (token) throw redirect("/");
  return data(null);
}

function Register() {
  const formMethods = useForm({
    defaultValues: {
      email: "handgod1995@gmail.com",
      password: "123456",
      confirmPassword: "12345",
      // nickname: "hdme1995",
      firstName: "truyen",
      lastName: "mai",
      vendor: "Pro-IERP",
      warehouse: "HCM",
    },
    resolver: zodResolver(registerSchema),
  });
  const navigate = useNavigate();
  const onError = (errors: any) => {
    console.log("errors", errors);
    // throw errors;
  };
  const fetcher = useFetcher<{ error: any; status: boolean }>({
    key: "register-form",
  });
  useEffect(() => {
    if ((fetcher.data as any)?.error?.code === "ER_DUP_ENTRY") {
      formMethods.setError("email", {
        message: ERRORS.ER_DUP_EMAIL,
      });
      fetcher.data = undefined;
    } else if (fetcher.data?.status) {
      toast.success({ message: REGISTER_MESSAGE.SUCCESS, title: "Thành công" });
      navigate("/login");
    }
  }, [fetcher.data]);

  return (
    <div className="w-full flex flex-col p-4 gap-4 items-center justify-center">
      <CardItem title="Đăng kí" className={cn("p-4 flex-col gap-2 shadow-xl", styles.box)}>
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(
              (v) => fetcher.submit(v, { method: "POST", action: "/register" }),
              onError
            )}
            action="/register"
            method="POST"
            className="grid grid-cols-2 gap-2"
          >
            <div className="col-span-1">
              <Controller
                control={formMethods.control}
                name="firstName"
                render={({ field }) => (
                  <TextInput label="Họ" {...field} onChange={(e: any) => field.onChange(e.target?.value)} />
                )}
              />
            </div>
            <div className="col-span-1">
              <Controller
                control={formMethods.control}
                name="lastName"
                render={({ field }) => (
                  <TextInput label="Tên" {...field} onChange={(e: any) => field.onChange(e.target?.value)} />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                control={formMethods.control}
                name="email"
                render={({ field }) => (
                  <TextInput label="Email" {...field} onChange={(e: any) => field.onChange(e.target?.value)} />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                control={formMethods.control}
                name="vendor"
                render={({ field }) => (
                  <TextInput label="Tên cơ sở" {...field} onChange={(e: any) => field.onChange(e.target?.value)} />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                control={formMethods.control}
                name="warehouse"
                render={({ field }) => (
                  <TextInput label="Tên kho/bãi" {...field} onChange={(e: any) => field.onChange(e.target?.value)} />
                )}
              />
            </div>
            <div className="col-span-2">
              <Controller
                control={formMethods.control}
                name="password"
                render={({ field }) => (
                  <TextInput
                    label="Mật khẩu"
                    {...field}
                    onChange={(e: any) => field.onChange(e.target?.value)}
                    type="password"
                  />
                )}
              />
            </div>

            <div className="col-span-2">
              <Controller
                control={formMethods.control}
                name="confirmPassword"
                render={({ field }) => (
                  <TextInput
                    label="Xác thực mật khẩu"
                    {...field}
                    onChange={(e: any) => field.onChange(e.target?.value)}
                    type="password"
                  />
                )}
              />
            </div>
            <div className="col-span-2">
              <div className="text-sm text-right">
                <Link to="/register" className="text-indigo-600">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <TMButton htmlType="submit" className="col-span-2">
              Đăng kí
            </TMButton>

            <div className="col-span-2 py-2">
              <div className="text-sm text-center">
                <span>Bạn đã có tài khoản? </span>
                <Link to="/login" className="text-indigo-600">
                  Đăng nhập
                </Link>
              </div>
            </div>
            <div className="flex items-center flex-row col-span-2">
              <div className="bg-indigo-600 h-0.5 w-full" />
              <span className="text-center text-sm flex-shrink-0 px-4">Đăng kí với</span>
              <div className="bg-indigo-600 h-0.5 w-full" />
            </div>
            <div className="flex flex-row justify-center gap-8 col-span-2">
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
  const form = await request.formData();
  const email = form.get("email");
  const password = form.get("password");
  const confirmPassword = form.get("confirmPassword");
  const firstName = form.get("firstName");
  const lastName = form.get("lastName");
  const vendor = form.get("vendor");
  const warehouse = form.get("warehouse");
  if (password !== confirmPassword) return json({ message: "Passwords don't match" }, { status: 400 });
  const data = { email, password, firstName, lastName, vendor, warehouse };
  const resp = await AuthService.register(data as IRegisterParams);
  if (resp.status === 200) {
    return json({
      status: true,
    });
  }
  return json(resp);
};
export default Register;
