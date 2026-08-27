# Coding Instruction - Inventory Management ERP/POS System

**Last Updated**: August 24, 2026  
**Version**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow](#workflow)
3. [UI Design](#ui-design)
4. [Improvement](#improvement)
5. [Testing](#testing)

---

## Overview

- Routes `app/routes` keep all availables navigation with simple struction: 
- Components `app/components` keep all component (atom/reuse) logic
- Hooks `app/hooks`
- Lib `app/libs`

```
export const loader = () => {}
export default function Page() {
  // Keep page logic here
}
export default action = () => {}
```


## Workflow

# 1. Separation of Concerns & Data Flow
- Main Logic & API Calls: Keep core routing and data fetching in Route files. All API calls (data retrieval and mutations) must be executed exclusively inside loader or action functions.
- Component Modularity: Decouple UI rendering from business logic. Extract re-usable rendering logic into UI components and complex state/effects into custom hooks.
- Request Parsing: Every loader and action must parse incoming request cookies before executing any logic:

```js
const { cookie, vendorId } = await parseCookieFromRequest(request);
```

# 2. Forms & Validation (React Hook Form + Zod)
- Threshold & Schema: Always use React Hook Form (RHF) for forms with more than 3 input fields. Pair RHF with zod and zodResolver to define strong TypeScript schemas and types.
- Field Indicators & Validation: Visually mark required fields in the UI. Ensure inline field validation errors trigger and display before submission occurs.

# 3. Internationalization & Security
- Localization (i18n): Never hardcode static UI text or labels. Always wrap text with the useTranslation hook.
- Access Control: Protect actionable UI elements (buttons that trigger navigation, creation, updating, or deletion) by wrapping them with <PermissionGuard>.

Implementation Example:
```tsx
// 1. Schema & Type Definition
const OrderFormSchema = z.object({
  customerName: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  itemCount: z.number().min(1, 'Must be at least 1')
});

type OrderFormData = z.infer<typeof OrderFormSchema>;

// 2. Route Action (Data & API Logic)
export async function action({ request }: ActionFunctionArgs) {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  // ... execute API call with cookie & vendorId
}

// 3. UI Component (RHF, i18n, PermissionGuard)
export function OrderForm() {
  const { t } = useTranslation();
  const form = useForm()
  const { register, handleSubmit, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(OrderFormSchema)
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>{t('order.customerName')} *</label>
        <input {...register('customerName')} />
        {errors.customerName && <span>{errors.customerName.message}</span>}

        {/* Action Button wrapped in PermissionGuard */}
        <PermissionGuard permission="order:create">
          <button type="submit">{t('common.submit')}</button>
        </PermissionGuard>
      </form>
    </FormProvider>
  );
}
```

# 4. Single-Responsibility & Explicit Data Flow:
- Pure & Returning Functions: Keep helper functions small, focused, and simple. Every helper function must return a meaningful result or status rather than mutating outer state or performing one-way side effects
- Centralized Flow Control: High-level coordinator functions (e.g., createOrder) are solely responsible for decision-making. They evaluate return values from helpers to determine success, handle errors, or proceed to the next step
- Avoid Hidden Breakpoints: Do not embed control flow logic (such as early return, break, or throwing errors) inside anonymous functions, inner callbacks, or isolated subroutines.

Example: Before (Implicit Flow & Anonymous Breaks):
```ts
async function createOrder(orderData) {
  // Anonymous callback hidden inside a loop with implicit error flow
  orderData.items.forEach((item) => {
    if (item.stock < item.qty) {
      throw new Error("Out of stock"); // Hard break deep inside callback
    }
  });

  saveToDatabase(orderData); // One-way action with no return status check
}
```
After (Refined: Returning Helpers & Main Control):
```ts
// Helper: Simple, single task, explicit return
function validateStock(items) {
  const insufficientItem = items.find(item => item.stock < item.qty);
  if (insufficientItem) {
    return { valid: false, reason: `Item ${insufficientItem.id} is out of stock` };
  }
  return { valid: true };
}

// Main: Explicit decision-making
async function createOrder(orderData) {
  const stockCheck = validateStock(orderData.items);
  
  if (!stockCheck.valid) {
    return { success: false, error: stockCheck.reason };
  }

  const savedOrder = await saveToDatabase(orderData);
  return { success: true, data: savedOrder };
}
```

## UI Design
- Prefer define ThemeProvider such as: primary-color, secondary-color, ...etc and use defined color instead of regular.


## Improvement
- Which question was answer/submit by user that improve current SKILL. You would update SKILL after submit.

## Testing
- After component/function/page created. You must to create/update test-case relate. Must adapt atleast 95% coverage.