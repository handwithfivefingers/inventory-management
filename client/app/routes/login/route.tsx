import { zodResolver } from "@hookform/resolvers/zod";
import { useFetcher, useNavigate } from "@remix-run/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { cn } from "~/libs/utils";
import { useUser } from "~/store/user.store";
import { ILoginResponse } from "~/types/user";
import styles from "./styles.module.scss";

const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

// export const action = async ({ request }: ActionFunctionArgs) => {
//   const formData = await request.formData();
//   const data = formData.get("data") || "";
//   if (!data) return null;
//   const parsed = JSON.parse(data as string);
//   const resp = await AuthService.login(parsed);

//   const { token } = resp;
//   return redirect("/", {
//     headers: {
//       "Set-Cookie": await session.serialize({ session: token }),
//     },
//   });
// };
function Login() {
  const formMethods = useForm({
    defaultValues: {
      email: "hdme1995@gmail.com",
      password: "123456",
    },
    resolver: zodResolver(loginSchema),
  });

  const { updateUser, updateToken, user } = useUser();
  const fetcher = useFetcher<ILoginResponse>({ key: "login-form" });
  const navigate = useNavigate();
  const onSubmit = async (v: any) => {
    fetcher.submit({ ...v }, { method: "POST", action: "/api/storage?/login" });
  };
  const onError = (errors: any) => {
    console.log("errors", errors);
  };
  // useEffect(() => {
  //   if (fetcher.data?.user && fetcher.state === "idle") {
  //     updateUser(fetcher.data.user);
  //     updateToken(fetcher.data.jwt);
  //   }
  // }, [fetcher.data]);

  // useEffect(() => {
  //   if (user?.id) {
  //     console.log("loaded");
  //     navigate("/");
  //   }
  // }, [user]);
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
