import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { VariantMasterGrid } from '../variant-master-grid';

vi.mock('~/components/permission-guard', () => ({ PermissionGuard: ({ children }: any) => children }));

function Subject() {
  const form = useForm<any>({ defaultValues: { variants: [{ options: { Color: 'Đỏ' }, skuCode: 'RED-01', quantity: 0, isActive: true, barcodes: [{ barcode: '8930001', conversionRate: 1, unitId: 1, costPrice: 1, retailPrice: 2, wholesalePrice: 2 }] }] } });
  return <FormProvider {...form}><VariantMasterGrid fields={[{ id: 'row-1' }]} type={1} units={[{ id: 1, name: 'Cái' }]} attributes={[{ name: 'Color', values: [{ label: 'Đỏ', value: 'Đỏ' }] }]} onRemove={() => undefined} /></FormProvider>;
}

describe('VariantMasterGrid', () => {
  it('renders SKU, zero-stock warning and pricing drawer trigger', () => {
    render(<Subject />);
    expect(screen.getByDisplayValue('RED-01')).toBeInTheDocument();
    expect(screen.getByText('Hết hàng')).toBeInTheDocument();
    expect(screen.getByText('Cấu hình Giá & Đơn vị')).toBeInTheDocument();
  });
});
