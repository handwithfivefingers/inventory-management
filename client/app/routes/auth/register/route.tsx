import { zodResolver } from "@hookform/resolvers/zod";
import { ActionFunctionArgs, LoaderFunctionArgs, data } from "@remix-run/node";
import { Link, useSubmit } from "@remix-run/react";
import { Controller, useForm } from "react-hook-form";
import { redirect } from "react-router";
import { authenticator } from "~/action.server/auth.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { registerSchema } from "~/constants/schema/register";
import { cn } from "~/libs/utils";
import { commitSession, getSession } from "~/sessions";
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
      email: "",
      password: "",
      confirmPassword: "",
      nickname: "",
      firstName: "",
      lastName: "",
      vendor: "",
      warehouse: "",
    },
    resolver: zodResolver(registerSchema),
  });
  const onError = (errors: any) => {
    console.log("errors", errors);
  };
  const submit = useSubmit();

  return (
    <div className="w-full flex flex-col p-4 gap-4 items-center justify-center">
      <CardItem title="Đăng kí" className={cn("p-4 flex-col gap-2 shadow-xl", styles.box)}>
        <form
          onSubmit={formMethods.handleSubmit(
            (v) => submit(v, { method: "POST", navigate: false }),
            (e) => onError(e)
          )}
          action="/login"
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

          <TMButton htmlType="submit" className="col-span-2">Đăng kí</TMButton>

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
      </CardItem>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  let user = await authenticator.authenticate("session", request);
  console.log("user", user);
  let session = await getSession(request.headers.get("cookie"));
  session.set("token", user.token);
  session.set("user", user.data);
  return redirect("/", {
    status: 301,
    headers: { "Set-Cookie": await commitSession(session) },
  });
};
export default Register;
