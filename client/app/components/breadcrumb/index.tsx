import { Link, useLocation } from "@remix-run/react";
import { Icon } from "~/components/icon";

const LABELS: Record<string, string> = {
  warehouses: "Kho hàng",
  products: "Sản phẩm",
  orders: "Đơn hàng",
  customers: "Khách hàng",
  providers: "Nhà cung cấp",
  categories: "Danh mục",
  invoices: "Hóa đơn",
  units: "Đơn vị",
  tags: "Thẻ",
  roles: "Vai trò",
  users: "Người dùng",
  settings: "Cài đặt",
  add: "Thêm mới",
  edit: "Chỉnh sửa",
  import: "Nhập hàng",
  "importOrder": "Nhập hàng",
};

function formatLabel(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  // numeric id or uuid-like -> Detail
  if (/^\d+$/.test(segment) || /^[0-9a-f-]{8,}/i.test(segment)) return "Chi tiết";
  // capitalize fallback
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumb() {
  const location = useLocation();
  const pathname = location.pathname;

  // hide on root / dashboard
  if (pathname === "/" || pathname === "") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; to: string; isLast: boolean }[] = [];

  // always start with Dashboard / Home
  crumbs.push({ label: "Trang chủ", to: "/", isLast: false });

  let acc = "";
  segments.forEach((seg, idx) => {
    acc += `/${seg}`;
    const isLast = idx === segments.length - 1;
    crumbs.push({ label: formatLabel(seg), to: acc, isLast });
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full px-3 pt-3 pb-0 shrink-0 bg-slate-50/50 dark:bg-transparent"
    >
      <ol className="flex items-center flex-wrap gap-1 text-sm text-slate-500 dark:text-slate-400">
        {crumbs.map((c, i) => (
          <li key={`${c.to}-${i}`} className="flex items-center gap-1">
            {i > 0 && (
              <Icon name="chevron-right" fontSize={14} className="text-slate-300 dark:text-slate-500 shrink-0" />
            )}
            {c.isLast ? (
              <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[180px]">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-primary transition-colors truncate max-w-[180px]">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
