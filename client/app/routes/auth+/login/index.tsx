import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@remix-run/react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { AuthService } from "~/action.client/auth.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { ILoginForm, loginSchema } from "~/constants/schema/login";
import { cn } from "~/libs/utils";
import styles from "./styles.module.scss";
import { ResponseError } from "~/http";
import { toast } from "~/components/notification";
import { useState } from "react";
import { WarehouseVendorSelectionModal } from "~/components/warehouse-vendor-selection-modal";
import { IVendor } from "~/types/vendor";
import { useUser } from "~/store/user.store";

function Login() {
  const navigate = useNavigate();
  const userStore = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<{
    vendors?: IVendor[];
    defaultVendorId?: number | null;
    defaultWarehouseId?: number | null;
  } | null>(null);

  const formMethods = useForm<ILoginForm>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

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
      message: "Đang chuyển hướng..."
    });
    navigate("/", { replace: true });
  };

  const handleSubmit = async (v: ILoginForm) => {
    setIsLoading(true);
    try {
      const resp = await AuthService.login(v);
      const loginData = resp.data;
      
      if (!loginData) {
        toast.danger({
          title: "Đăng nhập thất bại",
          message: "Không có dữ liệu phản hồi"
        });
        setIsLoading(false);
        return;
      }

      const userData = loginData.data;
      
      if (!userData) {
        toast.danger({
          title: "Đăng nhập thất bại",
          message: "Không có dữ liệu người dùng"
        });
        setIsLoading(false);
        return;
      }

      // Initialize user store with complete user data
      userStore.initialize({
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          nickname: userData.nickname,
          subscription: userData.subscription,
          roles: userData.roles,
          vendors: userData.vendors,
          defaultVendorId: userData.defaultVendorId,
          defaultWarehouseId: userData.defaultWarehouseId,
        },
        token: userData.token,
        roles: userData.roles,
        vendors: userData.vendors,
        defaultVendorId: userData.defaultVendorId,
        defaultWarehouseId: userData.defaultWarehouseId,
      });

      // Check if user has multiple vendors or warehouses
      const vendors = userData.vendors || [];
      const hasMultipleVendors = vendors.length > 1;
      const hasMultipleWarehouses = vendors.some((v: IVendor) => (v.warehouses?.length || 0) > 1);

      if (hasMultipleVendors || hasMultipleWarehouses) {
        // Show selection modal
        setPendingAuthData({
          vendors: userData.vendors,
          defaultVendorId: userData.defaultVendorId,
          defaultWarehouseId: userData.defaultWarehouseId,
        });
        setShowSelectionModal(true);
        setIsLoading(false);
      } else {
        toast.success({
          title: "Đăng nhập thành công",
          message: `Xin chào, ${userData?.firstName || "User"}!`
        });
        navigate("/", { replace: true });
      }
    } catch (error) {
      const err = error as ResponseError;
      toast.danger({
        title: "Đăng nhập thất bại",
        message: err?.message || "Có lỗi xảy ra, vui lòng thử lại"
      });
    } finally {
      setIsLoading(false);
    }
  }

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
                <TextInput
                  label="Email"
                  {...field}
                  onChange={(e: any) => field.onChange(e.target?.value)}
                />
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

export default Login;
