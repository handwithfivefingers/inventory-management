import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { VariantMasterGrid } from '../variant-master-grid';

vi.mock('~/components/permission-guard', () => ({ PermissionGuard: ({ children }: any) => children }));

function Subject({ barcodes = [{ barcode: '8930001', conversionRate: 1, unitId: 1, costPrice: 1, retailPrice: 2, wholesalePrice: 2 }] }: { barcodes?: any[] }) {
  const form = useForm<any>({ defaultValues: { variants: [{ options: { Color: 'Đỏ' }, skuCode: 'RED-01', quantity: 0, isActive: true, barcodes }] } });
  return <FormProvider {...form}><VariantMasterGrid fields={[{ id: 'row-1' } as any]} units={[{ id: 1, name: 'Cái' }]} attributes={[{ name: 'Color', values: [{ label: 'Đỏ', value: 'Đỏ' }] }]} remove={() => undefined} /></FormProvider>;
}

describe('VariantMasterGrid', () => {
  it('renders SKU, zero-stock warning and pricing drawer trigger', () => {
    render(<Subject />);
    expect(screen.getByDisplayValue('RED-01')).toBeInTheDocument();
    expect(screen.getByText('Hết hàng')).toBeInTheDocument();
    expect(screen.getByText('Cấu hình Giá & Đơn vị')).toBeInTheDocument();
  });

  it('shows a read-only retail-price range when a variant has multiple barcodes', () => {
    render(<Subject barcodes={[
      { barcode: '8930001', conversionRate: 1, unitId: 1, costPrice: 1, retailPrice: 20, wholesalePrice: 2 },
      { barcode: '8930002', conversionRate: 12, unitId: 2, costPrice: 1, retailPrice: 40, wholesalePrice: 2 },
    ]} />);

    expect(screen.getByText('20₫ – 40₫')).toBeInTheDocument();
    expect(screen.getByText(/2 mã vạch/)).toBeInTheDocument();
  });
});
