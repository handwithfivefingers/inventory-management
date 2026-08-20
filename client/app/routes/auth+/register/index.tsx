import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { FieldErrors, FormProvider, useForm } from "react-hook-form";
import { redirect, useNavigate } from "react-router";
import { AuthService } from "~/action.server/auth.service";
import { CardItem } from "~/components/card-item";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { ERRORS, REGISTER_MESSAGE } from "~/constants/message";
import { RegisterType, registerSchema } from "~/constants/schema/register";
import { useSubmitPromise } from "~/hooks";
import { cn } from "~/libs/utils";
import { getSession } from "~/sessions";
import { IRegisterParams } from "~/types/authenticate";
import styles from "./styles.module.scss";
export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get("cookie"));
  let token = session.get("token");
  if (token) throw redirect("/");
  return {};
}

function Register() {
  const formMethods = useForm<RegisterType>({
    defaultValues: {
      email: "handgod1995@gmail.com",
      password: "123456",
      confirmPassword: "123456",
      firstName: "truyen",
      lastName: "mai",
      vendor: "Pro-IERP",
      warehouse: "HCM",
    },
    resolver: registerSchema,
  });
  const navigate = useNavigate();
  const onError = (errors: FieldErrors<RegisterType>) => {
    console.log("errors", errors);
    // throw errors;
  };

  const { submit } = useSubmitPromise();
  // useEffect(() => {
  //   if ((fetcher.data as any)?.error?.code === "ER_DUP_ENTRY") {
  //     formMethods.setError("email", {
  //       message: ERRORS.ER_DUP_EMAIL,
  //     });
  //     fetcher.data = undefined;
  //   } else if (fetcher.data?.status) {
  //     toast.success({ message: REGISTER_MESSAGE.SUCCESS, title: "Thành công" });
  //     navigate("/login");
  //   }
  // }, [fetcher.data]);
  const onSubmit = async (values: RegisterType) => {
    try {
      const response = await submit<{ status: number; error?: Error }>({ ...values }, { method: "POST" });
      if (response.status !== 200) throw response.error;
      toast.success({ message: REGISTER_MESSAGE.SUCCESS, title: "Thành công" });
      navigate("/login");
    } catch (error) {
      console.log("error", error);
      if ((error as Error).name === "SequelizeUniqueConstraintError") {
        formMethods.setError("email", {
          message: ERRORS.ER_DUP_EMAIL,
        });
      }
    }
  };

  return (
    <div className="w-full flex flex-col p-4 gap-4 items-center justify-center">
      <CardItem title="Đăng kí" className={cn("p-4 flex-col gap-2 shadow-xl", styles.box)}>
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(onSubmit, onError)}
            action="/register"
            method="POST"
            className="grid grid-cols-2 gap-2"
          >
            <div className="col-span-1">
              <FormControl name="firstName">
                <TextInput label="Họ" />
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="lastName">
                <TextInput label="Tên" />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="email">
                <TextInput label="Email" />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="vendor">
                <TextInput label="Tên cơ sở" />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="warehouse">
                <TextInput label="Tên kho/bãi" />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="password">
                <TextInput label="Mật khẩu" type="password" />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="confirmPassword">
                <TextInput label="Xác thực mật khẩu" type="password" />
              </FormControl>
            </div>

            <div className="col-span-2">
              <div className="text-sm text-right">
                <Link to="/auth/register" className="text-indigo-600">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <TMButton htmlType="submit" className="col-span-2 w-full text-center">
              Đăng kí
            </TMButton>

            <div className="col-span-2 py-2">
              <div className="text-sm text-center">
                <span>Bạn đã có tài khoản? </span>
                <Link to="/auth/login" className="text-indigo-600">
                  Đăng nhập
                </Link>
              </div>
            </div>
            <div className="flex items-center flex-row col-span-2">
              <div className="bg-indigo-600 h-0.5 w-full" />
              <span className="text-center text-sm flex-shrink-0 px-4 w-full">Đăng kí với</span>
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
  try {
    const form = await request.formData();
    const data = (JSON.parse(form.get("data") as string) || undefined) as RegisterType | undefined;
    if (data?.password !== data?.confirmPassword) throw new Error("Passwords don't match");
    const resp = await AuthService.register(data as IRegisterParams);
    if (resp.status === 200) {
      return {
        status: 200,
      };
    }
    throw resp;
  } catch (error) {
    return {
      status: 400,
      response: error,
    };
  }
};
