import { zodResolver } from "@hookform/resolvers/zod";
import { useFetcher, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { loginSchema } from "~/constants/schema/login";
import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";

function Login() {
  const formMethods = useForm({
    defaultValues: {
      email: "hdme1995@gmail.com",
      password: "123456",
    },
    resolver: zodResolver(loginSchema),
  });
  const fetcher = useFetcher<{ status: number }>({ key: "login-form" });
  const onSubmit = async (v: any) => {
    fetcher.submit({ ...v }, { method: "POST", action: "/api/storage?/login" });
  };
  const onError = (errors: any) => {
    console.log("errors", errors);
  };
  useEffect(() => {
    if (fetcher.data?.status === 200) {
      (window as any).location.href = "/";
    }
  }, [fetcher.data]);
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <div className={cn("p-4 flex-col gap-2", styles.box)}>
        <h2>Login</h2>
        <form onSubmit={formMethods.handleSubmit(onSubmit, onError)}>
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

          <TMButton htmlType="submit">Đăng nhập</TMButton>
        </form>
      </div>
    </div>
  );
}

export default Login;
