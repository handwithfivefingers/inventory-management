import { useEffect, useMemo, useRef, useState } from "react";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { IProduct } from "~/types/product";
import { cn } from "~/libs/utils";
import { formatCurrency } from "~/libs/format-currency";

interface Props {
  show: boolean;
  close: () => void;
  onSelect: (product: IProduct) => void;
  data: IProduct[];
  onSearch: (value: string) => void;
  loading?: boolean;
}

const canPick = (p: IProduct) => {
  // Out-of-stock rule: products without the oversell flag cannot be picked
  // when their total stock is zero or negative. Variable products are gated
  // again at the variant level in VariantPickerModal.
  const stock = Number(p.quantity ?? 0);
  return stock > 0 || !!p.isNegative;
};

/**
 * Fast product picker for the order flow:
 *  - autofocus + Enter adds the first match (keyboard-first workflow)
 *  - clicking a row adds it AND keeps the modal open for multi-add
 *  - rows show price + live stock; out-of-stock rows (stock<=0 without the
 *    isNegative flag) are dimmed and disabled
 */
export const ProductSearchModal = ({ data, show, close, onSelect, onSearch, loading }: Props) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      setQuery("");
      // Autofocus after the modal paints
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.skuCode?.toLowerCase().includes(q),
    );
  }, [data, query]);

  const pickFirst = () => {
    const first = filtered.find(canPick);
    if (first) {
      onSelect(first);
      setQuery("");
    }
  };

  return (
    <TMModal open={show} close={close} width={640}>
      <div
        className="flex flex-col gap-2 w-full"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            pickFirst();
          }
          if (e.key === "Escape") close();
        }}
      >
        <div className="py-2">
          <TextInput
            ref={inputRef as any}
            autoFocus
            prefix={<Icon name="search" className="w-4" />}
            placeholder="Tìm theo tên, mã SP, SKU — Enter để chọn nhanh"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setQuery(e.target.value);
              onSearch(e.target.value);
            }}
          />
        </div>
        <div className="max-h-[55vh] overflow-auto">
          {loading && <div className="py-6 text-center text-sm text-slate-400">Đang tải…</div>}
          {!loading && filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">Không có sản phẩm phù hợp</div>
          )}
          {filtered.map((p) => {
            const pickable = canPick(p);
            const stock = Number(p.quantity ?? 0);
            return (
              <button
                key={p.id}
                type="button"
                disabled={!pickable}
                onClick={() => {
                  onSelect(p);
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-left transition-colors",
                  pickable ? "hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer" : "opacity-45 cursor-not-allowed",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.skuCode || p.code || `#${p.id}`}</div>
                </div>
                <div className="text-sm text-right shrink-0 w-28">{formatCurrency(p.salePrice ?? p.regularPrice ?? 0)}</div>
                <div
                  className={cn(
                    "text-xs text-right shrink-0 w-20 font-medium",
                    stock <= 0 ? "text-red-500" : stock < 10 ? "text-amber-500" : "text-slate-500",
                  )}
                >
                  {stock > 0 ? `Tồn: ${stock}` : "Hết hàng"}
                  {stock <= 0 && p.isNegative ? " (cho âm)" : ""}
                </div>
                <TMButton
                  variant="light"
                  size="xs"
                  tabIndex={-1}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    if (pickable) {
                      onSelect(p);
                      setQuery("");
                      inputRef.current?.focus();
                    }
                  }}
                >
                  Chọn
                </TMButton>
              </button>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
          <span>Enter: chọn kết quả đầu tiên · Esc: đóng</span>
          <span>{filtered.length} sản phẩm</span>
        </div>
      </div>
    </TMModal>
  );
};
