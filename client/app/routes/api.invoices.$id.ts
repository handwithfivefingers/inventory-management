import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { invoiceService } from "~/action.server/invoice.service";

/**
 * JSON endpoint for browser-side printing.
 * Used by Order detail's "In" buttons to fetch a fully-hydrated invoice
 * (with invoiceDetails + product/vendor/warehouse/order) before mounting the
 * InvisiblePrintContainer. Avoids the blank-page bug caused by printing the
 * summary row from GET /invoices?orderId= (which has fewer includes).
 *
 * GET /api/invoices/:id -> { data: IInvoice }
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id as string;
  if (!id) throw json({ message: "Missing invoice id" }, { status: 400 });
  try {
    const resp = await invoiceService.getInvoiceById(id);
    const data = (resp.data as any)?.data ?? resp.data;
    return json(data);
  } catch (e: any) {
    throw json({ message: e?.message || "Failed to load invoice" }, { status: 404 });
  }
};
