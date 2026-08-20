import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "react-router";
import { AuthService } from "~/action.client/auth.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { WarehouseVendorSelectionModal } from "~/components/warehouse-vendor-selection-modal";
import { ILoginForm, loginSchema } from "~/constants/schema/login";
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http";
import { cn } from "~/libs/utils";
import { commitSession, getSession, parseCookieFromRequest } from "~/sessions";
import { useUser } from "~/store/user.store";
import { IVendor } from "~/types/vendor";
import styles from "./styles.module.scss";
import { IUser } from "~/types/user";
export async function loader({ request }: LoaderFunctionArgs) {
  const { token, userId } = await parseCookieFromRequest(request);
  if (token && userId) throw redirect("/");
  return {};
}

function Login() {
  const navigate = useNavigate();
  const userStore = useUser();
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<{
    vendors?: IVendor[];
    defaultVendorId?: number | null;
    defaultWarehouseId?: number | null;
  } | null>(null);

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
      // const resp = await AuthService.login(v);
      const resp = await submit<{ data: IUser }>({ data: JSON.stringify(v) }, { method: "POST" });
      const user = resp.data;
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

  const handleWarehouseVendorConfirm = (vendorId: number, warehouseId: number) => {
    // Update user store with selected vendor and warehouse
    const vendors = pendingAuthData?.vendors || [];
    const selectedVendor = vendors.find((v) => v.id === vendorId);
    const selectedWarehouse = selectedVendor?.warehouses?.find((w) => w.id === warehouseId);

    if (selectedVendor) {
      userStore.setVendor(selectedVendor);
    }
    if (selectedWarehouse) {
      userStore.setWarehouse(selectedWarehouse);
    }

    setShowSelectionModal(false);
    toast.success({
      title: "Đã chọn",
      message: "Đang chuyển hướng...",
    });
    navigate("/", { replace: true });
  };

  return (
    <div className="w-full flex flex-col p-4 gap-4 items-center justify-center h-screen">
      <WarehouseVendorSelectionModal
        open={showSelectionModal}
        vendors={pendingAuthData?.vendors || []}
        defaultVendorId={pendingAuthData?.defaultVendorId}
        defaultWarehouseId={pendingAuthData?.defaultWarehouseId}
        onConfirm={handleWarehouseVendorConfirm}
      />
      <CardItem
        title="Đăng nhập"
        className={cn("p-4 flex-col gap-2 shadow-xl mx-auto max-w-[400px] w-full flex", styles.box)}
      >
        <FormProvider {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(handleSubmit)} className="flex flex-col gap-2">
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
                  label="Mật khẩu"
                  {...field}
                  onChange={(e: any) => field.onChange(e.target?.value)}
                  type="password"
                />
              )}
            />

            <TMButton htmlType="submit" loading={isLoading} disabled={isLoading || showSelectionModal}>
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
    console.log("resp", resp);
    if (resp.status !== 200) throw resp;
    const session = await getSession(request.headers.get("cookie"));
    const { token, ...user } = resp.data?.data || { id: "" };
    session.set("token", token as string);
    session.set("userId", user?.id);
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
