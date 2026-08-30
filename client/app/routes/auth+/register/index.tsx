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
import { parseCookieFromRequest } from "~/sessions";
import { IRegisterParams } from "~/types/authenticate";
import styles from "./styles.module.scss";
export async function loader({ request }: LoaderFunctionArgs) {
  const { userId, session } = await parseCookieFromRequest(request);
  if (userId) return redirect("/");
  return {};
}
export const meta = [
  {
    title: "Đăng ký tài khoản - Stockly",
  },
];

export default function Register() {
  const formMethods = useForm<RegisterType>({
    defaultValues: {
      email: "handgod1995@gmail.com",
      password: "123456",
      confirmPassword: "123456",
      fullName: "truyen mai",
      vendor: "Pro-IERP",
      warehouse: "HCM",
      niche: "other",
    },
    resolver: registerSchema,
  });
  const navigate = useNavigate();
  const onError = (errors: FieldErrors<RegisterType>) => {
    console.log("errors", errors);
    // throw errors;
  };

  const { submit } = useSubmitPromise();

  const onSubmit = async (values: RegisterType) => {
    try {
      const response = await submit<{ status: number; error?: Error }>(
        { data: JSON.stringify(values) },
        { method: "POST" },
      );
      if (response.status !== 200) throw response.error;
      toast.success({ message: REGISTER_MESSAGE.SUCCESS, title: "Thành công" });
      navigate("/auth/login");
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
            <div className="col-span-2">
              <FormControl name="email">
                <TextInput label="Email" required />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="password">
                <TextInput label="Mật khẩu" type="password" required />
              </FormControl>
            </div>
            <div className="col-span-2">
              <FormControl name="confirmPassword">
                <TextInput label="Xác thực mật khẩu" type="password" required />
              </FormControl>
            </div>

            <div className="col-span-2">
              <FormControl name="fullName">
                <TextInput label="Tên đầy đủ" />
              </FormControl>
            </div>

            <div className="col-span-1">
              <FormControl name="vendor">
                <TextInput label="Tên cơ sở" required />
              </FormControl>
            </div>
            <div className="col-span-1">
              <FormControl name="warehouse">
                <TextInput label="Tên kho/bãi" required />
              </FormControl>
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium">Mô hình</span>
              <FormControl name="niche">
                {(field) => {
                  return (
                    <div className="grid grid-cols-3 gap-1">
                      <NicheComponent active={field.value === "fashion"} onClick={() => field.onChange("fashion")}>
                        <div className="flex gap-1 text-slate-600">
                          <Icon name="package" fontSize={16} />
                          <span>Thời trang</span>
                        </div>
                      </NicheComponent>
                      <NicheComponent active={field.value === "accessory"} onClick={() => field.onChange("accessory")}>
                        <div className="flex gap-1 text-slate-600">
                          <Icon name="watch" fontSize={16} />
                          <span>Phụ kiện</span>
                        </div>
                      </NicheComponent>
                      <NicheComponent active={field.value === "other"} onClick={() => field.onChange("other")}>
                        <div className="flex gap-1 text-slate-600">
                          <Icon name="archive" fontSize={16} />
                          <span>Khác</span>
                        </div>
                      </NicheComponent>
                    </div>
                  );
                }}
              </FormControl>
            </div>

            <TMButton htmlType="submit" className="col-span-2 w-full text-center">
              Đăng kí
            </TMButton>

            <div className="col-span-2 py-2">
              <div className="text-sm text-center">
                <span>Bạn đã có tài khoản? </span>
                <Link to="/auth/login" className="text-primary">
                  Đăng nhập
                </Link>
              </div>
            </div>
            <div className="flex items-center flex-row col-span-2">
              <div className="bg-primary h-0.5 w-full" />
              <span className="text-center text-sm flex-shrink-0 px-4 w-full">Đăng kí với</span>
              <div className="bg-primary h-0.5 w-full" />
            </div>
            <div className="flex flex-row justify-center gap-8 col-span-2">
              <div className="p-2 rounded-md bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-all">
                <Icon name="facebook" className="text-primary" />
              </div>
              <div className="p-2 rounded-md bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-all">
                <Icon name="instagram" className="text-primary" />
              </div>
              <div className="p-2 rounded-md bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-all">
                <Icon name="mail" className="text-primary " />
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

const NicheComponent = ({
  children,
  active = false,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) => {
  return (
    <div
      className={cn("px-4 py-2 rounded border-2 border-slate-100 bg-slate-50 cursor-pointer", {
        "border-indigo-400": active,
      })}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
