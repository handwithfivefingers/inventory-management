import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { shiftService } from "~/action.server/shift.service";
import { staffService } from "~/action.server/staff.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "1";
    const pageSize = url.searchParams.get("pageSize") || "10";

    const [current, list, staffs] = await Promise.all([
      shiftService.getCurrent(warehouseId as string, { cookie, vendorId }),
      shiftService.get({ warehouseId: warehouseId as string, vendorId, page, pageSize, cookie }),
      staffService.get({ warehouseId: warehouseId as string, vendorId, page: "1", pageSize: "100", cookie }),
    ]);

    return {
      current: current.data?.data ?? null,
      data: list.data?.data ?? [],
      total: list.data?.total ?? 0,
      staffs: staffs.data?.data ?? [],
      warehouseId: warehouseId as string,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chốt ca" }, { name: "description", content: "Quản lý ca làm việc" }];
};

export default function Shift() {
  const { current, data, total, staffs, warehouseId } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const { t } = useTranslation();
  const [openingCash, setOpeningCash] = useState<number | string>(0);
  const [closingCash, setClosingCash] = useState<number | string>(0);
  const [staffId, setStaffId] = useState<string | undefined>(undefined);

  const handleOpen = async () => {
    try {
      await shiftService.open({
        openingCash: Number(openingCash),
        warehouseId: Number(warehouseId),
        staffId: staffId ? Number(staffId) : undefined,
      });
      toast.success({ title: "Thành công", message: "Mở ca thành công" });
      revalidator.revalidate();
    } catch (e) {
      toast.danger({ title: "Lỗi", message: (e as any).message });
    }
  };

  const handleClose = async () => {
    if (!current) return;
    try {
      await shiftService.close(current.id, { closingCash: Number(closingCash) });
      toast.success({ title: "Thành công", message: "Đóng ca thành công" });
      revalidator.revalidate();
    } catch (e) {
      toast.danger({ title: "Lỗi", message: (e as any).message });
    }
  };

  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={t("shift.title")} className="p-4">
        {current ? (
          <div className="flex flex-col gap-2 mb-4 p-3 border rounded-md border-indigo-300">
            <div className="text-green-600 font-semibold">
              {t("shift.openTime")}: {dayjs(current.openTime).format("DD/MM/YYYY HH:mm")} - {current.code}
            </div>
            <div className="flex gap-2 items-end">
              <div className="w-48">
                <NumberInput label={t("shift.closingCash")} value={closingCash as any} onValueChange={(v) => setClosingCash(v.value)} />
              </div>
              <TMButton variant="light" onClick={handleClose}>
                {t("shift.close")}
              </TMButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4 p-3 border rounded-md border-indigo-300">
            <div className="text-gray-500">{t("shift.noOpenShift")}</div>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="w-48">
                <NumberInput label={t("shift.openingCash")} value={openingCash as any} onValueChange={(v) => setOpeningCash(v.value)} />
              </div>
              <div className="w-48">
                <SelectInput
                  label={t("shift.staff") ?? "Staff"}
                  placeholder="Staff"
                  options={staffs.map((s: any) => ({ label: s.fullName, value: s.id }))}
                  value={staffId}
                  onSelect={(v) => setStaffId(v as string)}
                />
              </div>
              <TMButton variant="light" onClick={handleOpen}>
                {t("shift.open")}
              </TMButton>
            </div>
          </div>
        )}

        <TMTable
          columns={[
            { title: t("shift.stt"), dataIndex: "id", width: 80, render: (_r, i) => Number(i) + 1 },
            { title: t("shift.code"), dataIndex: "code" },
            {
              title: t("shift.openTime"),
              dataIndex: "openTime",
              render: (r) => dayjs(r.openTime).format("DD/MM/YYYY HH:mm"),
            },
            {
              title: t("shift.closeTime"),
              dataIndex: "closeTime",
              render: (r) => (r.closeTime ? dayjs(r.closeTime).format("DD/MM/YYYY HH:mm") : "-"),
            },
            {
              title: t("shift.openingCash"),
              dataIndex: "openingCash",
              render: (r) => <NumericFormat value={r.openingCash} displayType="text" thousandSeparator="," />,
            },
            {
              title: t("shift.closingCash"),
              dataIndex: "closingCash",
              render: (r) =>
                r.closingCash != null ? (
                  <NumericFormat value={r.closingCash} displayType="text" thousandSeparator="," />
                ) : (
                  "-"
                ),
            },
            {
              title: t("shift.difference"),
              dataIndex: "difference",
              render: (r) =>
                r.difference != null ? (
                  <NumericFormat value={r.difference} displayType="text" thousandSeparator="," />
                ) : (
                  "-"
                ),
            },
            {
              title: t("shift.status"),
              dataIndex: "status",
              render: (r) => (r.status === "open" ? t("shift.open") : t("shift.close")),
            },
          ]}
          data={data}
          rowKey="id"
        />
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}
