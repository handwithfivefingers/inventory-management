import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { customerService } from "~/action.server/customer.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { getSession } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getSession(request.headers.get("cookie") as string);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const session = await getSession(cookie);
  const vendorId = session.get("vendorId");

  const formData = await request.formData();
  const data = {
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    address: formData.get("address") as string,
    taxCode: formData.get("taxCode") as string,
    vendorId: Number(vendorId),
  };

  try {
    await customerService.createCustomer({ cookie, ...data });
    return redirect("/customers");
  } catch (error: any) {
    return { error: error.message || "Tạo khách hàng thất bại" };
  }
};

export default function AddCustomer() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSubmitting = navigation.state === "submitting";

  const validate = (form: HTMLFormElement) => {
    const newErrors: Record<string, string> = {};
    const formData = new FormData(form);

    if (!formData.get("name")) {
      newErrors.name = "Tên khách hàng là bắt buộc";
    }

    const email = formData.get("email") as string;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email không hợp lệ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!validate(e.currentTarget)) {
      e.preventDefault();
    }
  };

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Tạo khách hàng mới" className="p-4">
        <Form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
          {actionData?.error && <p className="text-red-500 text-sm">{actionData.error}</p>}
          <div>
            <TextInput
              label="Tên khách hàng *"
              name="name"
              placeholder="Nhập tên khách hàng"
              required
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <TextInput
                label="Số điện thoại"
                name="phone"
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div>
              <TextInput
                label="Email"
                name="email"
                type="email"
                placeholder="Nhập email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <TextInput
              label="Địa chỉ"
              name="address"
              placeholder="Nhập địa chỉ"
              multiline
              rows={3}
            />
          </div>

          <div>
            <TextInput
              label="Mã số thuế"
              name="taxCode"
              placeholder="Nhập mã số thuế"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Link to="/customers">
              <TMButton variant="light">Hủy</TMButton>
            </Link>
            <TMButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo..." : "Tạo khách hàng"}
            </TMButton>
          </div>
        </Form>
      </CardItem>
    </div>
  );
}
