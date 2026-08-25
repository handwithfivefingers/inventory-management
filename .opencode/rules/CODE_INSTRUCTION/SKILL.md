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

- Main logic alway in Routes
- Split UI logic, function in components and hooks if able
- Always use useTranslation - i18n for static text/label
- Keep in mind, RHF is useful and need to added if more than 3 input field and need to define Schema,Type by using zod and zodResolver. Each field also need to show require if able. Need to validation and show field validation if have before any submit.
- Call API must be call in loader/action
- In loader/action: Need to parse request before any action by `parseCookieFromRequest`. 
Example:   `const { cookie, vendorId } = await parseCookieFromRequest(request);`
- Which Button Action such as Navigation or Create/Update, need to wrapped by PermissionGuard.

## UI Design
- Prefer define ThemeProvider such as: primary-color, secondary-color, ...etc and use defined color instead of regular.


## Improvement
- Which question was answer/submit by user that improve current SKILL. You would update SKILL after submit.

## Testing
- After component/function/page created. You must to create/update test-case relate. Must adapt atleast 95% coverage.