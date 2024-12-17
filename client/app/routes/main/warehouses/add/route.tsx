import type { MetaFunction } from "@remix-run/node";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function WarehouseItem() {
  const formMethods = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });
  const { control, handleSubmit } = formMethods;
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Thông tin kho hàng">
        <FormProvider {...formMethods}>
          <form className="grid grid-cols-2 gap-x-4">
            <div className="col-span-2">
              <Controller
                control={control}
                name="name"
                render={({ field }) => <TextInput label="Tên kho hàng" {...field} />}
              />
            </div>
            <div className="col-span-1">
              <Controller
                control={control}
                name="email"
                render={({ field }) => <TextInput label="Email" {...field} />}
              />
            </div>
            <div className="col-span-1">
              <Controller
                control={control}
                name="phone"
                render={({ field }) => <TextInput label="Số điện thoại" {...field} />}
              />
            </div>
            <div className="col-span-2 ">
              <Controller
                control={control}
                name="address"
                render={({ field }) => <TextInput label="Đia chỉ" {...field} />}
              />
            </div>
          </form>
        </FormProvider>
      </CardItem>
    </div>
  );
}
