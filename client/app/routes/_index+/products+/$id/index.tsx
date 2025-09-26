import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { historyService } from "~/action.server/history.service";
import { productService } from "~/action.server/products.service";
import { BarCode } from "~/components/barcode";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { DatePicker } from "~/components/form/date-picker";
import { MultiSelectInput } from "~/components/form/multi-select-input";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";
import { ICategory } from "~/types/category";
import { IProduct } from "~/types/product";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    const { warehouseId, cookie } = await parseCookieFromRequest(request);
    const { id } = params;
    if (!id || !warehouseId) throw new Error("Không tìm thấy sản phẩm");
    const resp = await productService.getProductById({ id, cookie, warehouseId });
    const history = await historyService.getProductHistory({ id: id as string, warehouseId: [warehouseId], cookie });
    return { ...resp, history };
  } catch (error) {
    throw data(error, { status: 400 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const { data, history } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  console.log("history", history);
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex justify-between items-center">
            <h5>{edit ? "Chỉnh sửa" : data?.name}</h5>
            <TMButton variant="ghost" size="xs" onClick={() => setEdit(!edit)}>
              {edit ? "Hủy" : "Sửa"}
            </TMButton>
          </div>
        }
        className="p-4 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          {!edit ? <Detail /> : null}
          {edit ? <EditForm /> : null}
        </div>
      </CardItem>
      <HistoryList history={history?.data || []} />
    </div>
  );
}
const Detail = () => {
  const { data } = useLoaderData<typeof loader>();
  console.log("data", data);
  return (
    <div className="w-full grid grid-cols-5 gap-4">
      <div className="col-span-2 flex gap-2 flex-col ">
        <div className="bg-slate-50 w-full h-full p-8 rounded-lg aspect-square" />
        <div className="w-full py-2 rounded-md flex justify-center">
          <BarCode code={data?.code || ""} />
        </div>
      </div>
      <div className="col-span-3 px-12">
        <ul className="flex flex-col gap-2">
          <li className="flex justify-between">
            <span>Ngày tạo: </span>
            <span>{dayjs(data?.createdAt).format("DD/MM/YYYY")}</span>
          </li>
          <li className="flex justify-between">
            <span>Mã hàng hóa: </span>
            <span>{data?.code} </span>
          </li>
          <li className="flex justify-between">
            <span>Mã sku: </span>
            <span>{data?.skuCode} </span>
          </li>
          <li className="flex justify-between">
            <span>Đã bán: </span>
            <span>{data?.sold} </span>
          </li>
          <li className="flex justify-between">
            <span>Tồn kho: </span>
            <span>{data?.quantity} </span>
          </li>
          <li className="flex justify-between">
            <span>Đơn vị tính: </span>
            <span>{data?.unitName} </span>
          </li>
          <li className="flex justify-between">
            <span>Danh mục: </span>
            <span>
              {data?.categories?.length
                ? (data?.categories as ICategory[])?.map((item: ICategory) => item.name).join(", ")
                : ""}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá bán lẻ: </span>
            <span>
              <NumericFormat value={data?.regularPrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá khuyến mại: </span>
            <span>
              <NumericFormat value={data?.salePrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá bán sỉ: </span>
            <span>
              <NumericFormat value={data?.wholeSalePrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá vốn: </span>
            <span>
              <NumericFormat value={data?.costPrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
const EditForm = () => {
  const { data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const formMethods = useForm({
    defaultValues: {
      name: "",
      code: "SM-001",
      skuCode: "ASM-0000001",
      quantity: 10,
      unit: undefined,
      categories: [],
      tags: [],
      description: " ",
      costPrice: undefined,
      regularPrice: undefined,
      salePrice: undefined,
      wholeSalePrice: undefined,
      VAT: 5,
      expiredAt: undefined,
    },
    // values: {
    //   ...data,
    //   categories: (data.categories as ICategory[])?.map((item: ICategory) => item?.id) || [],
    //   tags: (data.tags as ICategory[])?.map((item: ICategory) => item?.id) || [],
    //   unit: data.unitId || undefined,
    // },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = (v: any): void => {
    // fetcher.submit(
    //   {
    //     data: JSON.stringify({
    //       data: { ...v, id: data.id },
    //     }),
    //   },
    //   { method: "POST", action: "/products/edit" }
    // );
  };

  const { load, data: categories } = useFetcher<{ data: ICategory[] }>({ key: "categories" });
  const { load: loadUnits, data: units } = useFetcher<{ data: ICategory[] }>({ key: "units" });
  const { load: loadTags, data: tags } = useFetcher<{ data: ICategory[] }>({ key: "tags" });
  useEffect(() => {
    load("/categories");
    loadUnits("/units");
    loadTags("/tags");
    (window as any).form = formMethods;
  }, []);

  const submit = (v: any) => {
    console.log("v", v);
    onSubmit({ ...v });
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="py-2 grid grid-cols-12 gap-4"
        onSubmit={formMethods.handleSubmit(submit, (error) => handleError(error))}
      >
        <div className="col-span-12">
          <Controller
            name="name"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <TextInput
                  label="Tên hàng hóa"
                  value={field.value as any}
                  onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                />
              );
            }}
          />
        </div>
        <div className="col-span-6">
          <Controller
            name="code"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <TextInput
                  label="Mã code"
                  value={field.value as any}
                  onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                />
              );
            }}
          />
        </div>
        <div className="col-span-6">
          <Controller
            name="skuCode"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <TextInput
                  label="Mã sku"
                  value={field.value as any}
                  onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                />
              );
            }}
          />
        </div>
        <div className="col-span-4">
          <Controller
            name="costPrice"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <NumberInput
                  label="Giá vốn"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          />
        </div>
        <div className="col-span-4">
          <Controller
            name="regularPrice"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <NumberInput
                  label="Giá bán lẻ"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          />
        </div>
        <div className="col-span-4">
          <Controller
            name="salePrice"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <NumberInput
                  label="Giá khuyến mại"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          />
        </div>
        <div className="col-span-4">
          <Controller
            name="wholeSalePrice"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <NumberInput
                  label="Giá bán sỉ"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          />
        </div>
        <div className="col-span-6">
          <Controller
            name="expiredAt"
            control={formMethods.control}
            render={({ field }) => {
              return (
                // <NumberInput
                //   label="Ngày hết hạn"
                //   value={field.value as any}
                //   onValueChange={(v, info) => {
                //     field.onChange(v.value);
                //   }}
                // />
                <DatePicker {...field} label="Ngày hết hạn" />
              );
            }}
          />
        </div>
        <div className="col-span-2">
          <Controller
            name="VAT"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <NumberInput
                  label="VAT(%)"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          />
        </div>
        <div className="col-span-6">
          <Controller
            name="quantity"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <NumberInput
                  label="Tồn kho"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          />
        </div>
        <div className="col-span-6">
          <Controller
            name="unit"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <SelectInput
                  options={units?.data?.map((cate) => ({ label: cate.name, value: cate?.id || undefined })) || []}
                  label="Đơn vị tính"
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          />
        </div>
        <div className="col-span-6">
          <Controller
            name="categories"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <MultiSelectInput
                  options={categories?.data?.map((cate) => ({ label: cate.name, value: cate?.id || undefined })) || []}
                  label="Danh Mục"
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          />
        </div>
        <div className="col-span-6">
          <Controller
            name="tags"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <MultiSelectInput
                  options={tags?.data?.map((tag) => ({ label: tag.name, value: tag?.id || undefined })) || []}
                  label="Thành phần"
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          />
        </div>
        <div className="col-span-12">
          <Controller
            name="description"
            control={formMethods.control}
            render={({ field }) => {
              return (
                <TextInput
                  label="Ghi chú"
                  {...field}
                  onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                />
              );
            }}
          />
        </div>
        <div className="ml-auto col-span-12">
          <TMButton htmlType="submit">Submit</TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

const HistoryList = ({ history }: { history: IProduct[] }) => {
  return (
    <CardItem title={`Lịch sử tồn kho`} className="p-4">
      <div className="w-full flex flex-col gap-2">
        {history?.map((item: any) => {
          return (
            <div className={"py-2 px-4 rounded flex justify-between bg-slate-300"}>
              <div className="flex gap-2 items-start w-full ">
                <div className="flex gap-2 items-start flex-1">
                  <Icon
                    name={item.type == 0 ? "arrow-down" : "arrow-up"}
                    className={cn("w-6 shrink-0 mt-1", {
                      ["text-green-600"]: item.type == 0,
                      ["text-red-500"]: item.type == 1,
                    })}
                  />
                  <div className="flex flex-col gap-1 flex-1">
                    <h5
                      className={cn("text-xl font-semibold", {
                        ["text-green-600"]: item.type == 0,
                        ["text-red-500"]: item.type == 1,
                      })}
                    >
                      {item?.type == 0 ? "Nhập Kho" : "Xuất kho"}
                    </h5>
                    <p className="text-gray-500 font-normal text-base">
                      Số lượng: <span className="text-black font-bold">{item.quantity || 0}</span>
                    </p>
                  </div>
                </div>
                <span className="px-2 text-slate-700 text-sm">
                  {dayjs(item.createdAt).format("DD/MM/YYYY")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </CardItem>
  );
};
// export const action = async ({ request }: any) => {
//   const session = await getSession(request.headers.get("Cookie"));
//   const warehouse = session.get("warehouse");
//   const formData = await request.formData();
//   const data = await formData.get("data");
//   const dataJson = JSON.parse(data);
//   const bodyData = { ...dataJson.data, warehouseId: warehouse };
//   const resp = await productService.updateProduct(bodyData);
//   return resp;
// };

export function ErrorBoundary() {
  return <ErrorComponent />;
}
