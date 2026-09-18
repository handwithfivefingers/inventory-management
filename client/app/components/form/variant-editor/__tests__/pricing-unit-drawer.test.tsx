import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { PricingUnitDrawer } from '../pricing-unit-drawer';

vi.mock('~/components/permission-guard', () => ({ PermissionGuard: ({ children }: any) => children }));

function Subject() {
  const form = useForm<any>({ defaultValues: { variants: [{ quantity: 25, barcodes: [{ barcode: 'BASE', unitId: 1, conversionRate: 1, costPrice: 10, retailPrice: 20, wholesalePrice: 15 }] }] } });
  return <FormProvider {...form}><PricingUnitDrawer index={0} units={[{ id: 1, name: 'Cái' }, { id: 2, name: 'Hộp' }]} trigger="Cấu hình Giá & Đơn vị" /></FormProvider>;
}

describe('PricingUnitDrawer', () => {
  it('locks rate one and lets the user append a selling unit', () => {
    render(<Subject />);
    fireEvent.click(screen.getByText('Cấu hình Giá & Đơn vị'));
    expect(screen.getByText('Đơn vị gốc')).toBeInTheDocument();
    expect(document.querySelectorAll('input[inputmode="numeric"]')[0]).toBeDisabled();
    fireEvent.click(screen.getByText('Thêm quy cách'));
    expect(document.querySelectorAll('input[inputmode="numeric"]')).toHaveLength(8);
  });
});
