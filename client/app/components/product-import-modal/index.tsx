import { useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { useTranslation } from "~/i18n";

export interface IImportReport {
  created?: number;
  updated?: number;
  failed?: number;
  errors?: { row: number; message: string }[];
}

/**
 * Products Excel import flow:
 * 1. Download the template (GET /api/products/import/template)
 * 2. Pick an .xlsx/.csv file and submit (POST /api/products/import)
 * 3. Show a per-row success/error report.
 */
export const ProductImportModal = ({ show, close }: { show: boolean; close: () => void }) => {
  const { t } = useTranslation();
  const fetcher = useFetcher<{ success?: boolean; report?: IImportReport; error?: string }>({ key: "product-import" });
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>();

  const report = fetcher.data?.report;
  const busy = fetcher.state !== "idle";

  const handleDownloadTemplate = async () => {
    try {
      const resp = await fetch("/api/products/import/template", { credentials: "include" });
      if (!resp.ok) throw new Error("Không tải được file mẫu");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.danger({ title: "Lỗi", message: error?.message || "Tải file mẫu thất bại" });
    }
  };

  const handleSubmit = () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    fetcher.submit(form, { method: "POST", encType: "multipart/form-data" });
  };

  if (!show) return null;

  return (
    <TMModal open={show} close={close} width={560}>
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between">
          <span className="font-medium">{t("common.importExcel")}</span>
          <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Tải file mẫu, điền danh sách sản phẩm rồi upload. Dòng có cột <b>skuCode</b> trùng với sản phẩm hiện có sẽ
          được cập nhật (giá, tồn kho), dòng mới sẽ được tạo.
        </p>

        <div className="flex gap-2">
          <TMButton variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Icon name="download" fontSize={14} />
            Tải file mẫu
          </TMButton>
          <TMButton variant="light" size="sm" onClick={() => inputRef.current?.click()}>
            <Icon name="file-plus" fontSize={14} />
            {file ? file.name : "Chọn file .xlsx"}
          </TMButton>
          <input
            type="file"
            className="hidden"
            ref={inputRef}
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </div>

        {report && (
          <div className="border rounded p-3 text-sm flex flex-col gap-1 bg-slate-50">
            <div className="flex gap-4">
              <span className="text-green-600">Tạo mới: {report.created ?? 0}</span>
              <span className="text-blue-600">Cập nhật: {report.updated ?? 0}</span>
              <span className="text-red-600">Lỗi: {report.failed ?? 0}</span>
            </div>
            {(report.errors || []).slice(0, 10).map((e, i) => (
              <div key={i} className="text-xs text-red-500">
                Dòng {e.row}: {e.message}
              </div>
            ))}
            {(report.errors?.length || 0) > 10 && (
              <div className="text-xs text-slate-400">... và {(report.errors?.length || 0) - 10} lỗi khác</div>
            )}
          </div>
        )}

        {fetcher.data?.error && <p className="text-sm text-red-500">{fetcher.data.error}</p>}

        <div className="flex justify-end gap-2">
          <TMButton variant="ghost" size="sm" onClick={close}>
            Đóng
          </TMButton>
          <TMButton size="sm" disabled={!file || busy} loading={busy} onClick={handleSubmit}>
            <Icon name="upload" fontSize={14} />
            Nhập
          </TMButton>
        </div>
      </div>
    </TMModal>
  );
};
