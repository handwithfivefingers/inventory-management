import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { stocktakeService } from "~/action.server/stocktake.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { NumberInput } from "~/components/form/number-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { cn } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  if (!id) throw new Error("Không tìm thấy phiên kiểm kho");
  const resp = await stocktakeService.getById({ id, cookie, vendorId });
  const session: any = (resp.data as any)?.data;
  return { session };
};

export const meta: MetaFunction = () => {
  return [{ title: "Phiên kiểm kho" }];
};

type Line = {
  id: number;
  productId: number;
  variantId: number | null;
  expectedQuantity: number;
  actualQuantity: number | null;
  note: string | null;
  product?: { id: number; name: string; skuCode?: string };
  variant?: { id: number; skuCode: string } | null;
};

/**
 * Count-entry screen: shows the expected snapshot and lets the user fill the
 * physical count per line. Variances are highlighted; "Hoàn tất" applies them
 * to inventory through corrective transfers (server-side).
 */
export default function StocktakeSession() {
  const { session } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<{ success?: boolean; error?: string; message?: string }>({ key: "stocktake-session" });

  const lines: Line[] = session?.StocktakeDetails || session?.details || session?.stocktakeDetails || [];
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const isOpen = session?.status === "open";

  const getValue = (line: Line) => counts[line.id] ?? (line.actualQuantity == null ? "" : String(line.actualQuantity));
  const varianceOf = (line: Line) => {
    const v = getValue(line);
    if (v === "") return null;
    const actual = Number(v);
    if (!Number.isFinite(actual)) return null;
    return actual - Number(line.expectedQuantity);
  };

  const dirtyLines = lines
    .filter((l) => counts[l.id] !== undefined || notes[l.id] !== undefined)
    .map((l) => ({
      id: l.id,
      actualQuantity: counts[l.id] !== undefined ? (counts[l.id] === "" ? null : Number(counts[l.id])) : l.actualQuantity,
      note: notes[l.id] !== undefined ? notes[l.id] : l.note,
    }));

  const handleSave = () => {
    if (!dirtyLines.length) return;
    fetcher.submit({ intent: "save", data: JSON.stringify({ lines: dirtyLines }) }, { method: "POST" });
  };
  const handleComplete = () => {
    if (!confirm("Hoàn tất kiểm kho? Chênh lệch sẽ được điều chỉnh vào tồn kho.")) return;
    fetcher.submit({ intent: "complete", data: JSON.stringify({ lines: dirtyLines }) }, { method: "POST" });
  };

  if (fetcher.state === "idle" && fetcher.data) {
    if (fetcher.data.success) {
      toast.success({ title: "Thành công", message: fetcher.data.message || "Đã lưu" });
      if ((fetcher.data as any).completed) navigate("/warehouses/stocktake");
    } else {
      toast.danger({ title: "Lỗi", message: fetcher.data.error || "Thất bại" });
    }
  }

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-3">
        <CardItem
          title={
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="clipboard" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  {session?.code} — {isOpen ? "Đang kiểm" : session?.status === "completed" ? "Hoàn tất" : "Đã hủy"}
                </h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  {lines.length} dòng · Nhập số lượng thực tế cho từng dòng
                </p>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <TMTable
            scrollable
            columns={[
              {
                title: "Sản phẩm",
                dataIndex: "product",
                render: (r: Line) => (
                  <div className="flex flex-col">
                    <span>{r.product?.name || `#${r.productId}`}</span>
                    {r.variant && <span className="text-xs text-slate-400">{r.variant.skuCode}</span>}
                  </div>
                ),
              },
              { title: "Tồn hệ thống", dataIndex: "expectedQuantity", width: 110, render: (r: Line) => r.expectedQuantity },
              {
                title: "Thực tế",
                dataIndex: "actualQuantity",
                width: 130,
                render: (r: Line) =>
                  isOpen ? (
                    <NumberInput
                      value={getValue(r)}
                      onValueChange={(v: any) => setCounts((prev) => ({ ...prev, [r.id]: v.value != null ? String(v.value) : "" }))}
                    />
                  ) : (
                    (r.actualQuantity ?? "—")
                  ),
              },
              {
                title: "Chênh lệch",
                dataIndex: "variance",
                width: 100,
                render: (r: Line) => {
                  const v = varianceOf(r);
                  if (v === null) return <span className="text-slate-300">—</span>;
                  return (
                    <span className={cn("font-medium", v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-slate-500")}>
                      {v > 0 ? `+${v}` : v}
                    </span>
                  );
                },
              },
              {
                title: "Ghi chú",
                dataIndex: "note",
                render: (r: Line) =>
                  isOpen ? (
                    <TextInput
                      value={notes[r.id] ?? r.note ?? ""}
                      onChange={(e: any) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    />
                  ) : (
                    (r.note || "—")
                  ),
              },
            ]}
            data={lines}
            rowKey="id"
          />

          {isOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleComplete();
              }}
              className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-100 dark:border-slate-700"
            >
              <TMButton variant="ghost" size="sm" onClick={() => navigate("/warehouses/stocktake")}>
                Đóng
              </TMButton>
              <TMButton variant="outline" size="sm" disabled={!dirtyLines.length} loading={fetcher.state !== "idle"} onClick={handleSave}>
                <Icon name="save" fontSize={14} />
                Lưu tạm
              </TMButton>
              <TMButton size="sm" htmlType="submit" loading={fetcher.state !== "idle"}>
                <Icon name="check" fontSize={14} />
                Hoàn tất & điều chỉnh tồn kho
              </TMButton>
            </form>
          )}
        </CardItem>
      </div>
    </div>
  );
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { id } = params;
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  try {
    if (intent === "save") {
      const data = JSON.parse((formData.get("data") as string) || "{}");
      await stocktakeService.updateLines({ id: id as string, cookie, vendorId, lines: data.lines || [] });
      return Response.json({ success: true, message: "Đã lưu số kiểm" });
    }
    if (intent === "complete") {
      const data = JSON.parse((formData.get("data") as string) || "{}");
      if (data.lines?.length) {
        await stocktakeService.updateLines({ id: id as string, cookie, vendorId, lines: data.lines });
      }
      await stocktakeService.complete({ id: id as string, cookie, vendorId });
      return Response.json({ success: true, message: "Đã hoàn tất kiểm kho", completed: true });
    }
    return Response.json({ success: false, error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Thất bại" }, { status: 400 });
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}
