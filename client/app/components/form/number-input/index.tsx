import { NumericFormat } from "react-number-format";
import { ITextInput, TextInput } from "../text-input";
import { forwardRef } from "react";
export interface INumberInput extends ITextInput {
  thousandSeparator?: string;
  displayType?: string;
  onValueChange?: (...arg: any) => any;
}
export const NumberInput = forwardRef<HTMLInputElement, INumberInput>(
  ({ thousandSeparator = ",", onValueChange, displayType = "input", prefix, style, onChange, ...rest }, ref) => {
    // NOTE: the incoming DOM-event `onChange` (e.g. react-hook-form's `field.onChange`
    // via `{...field}` spreads) is intentionally NOT forwarded to NumericFormat.
    // Its `event.target.value` is the *formatted* display string ("20,000"), which
    // would overwrite the raw numeric value in form state and get submitted.
    // The single writer is `onValueChange` below (`value`/`floatValue` have no
    // thousand separators). `onBlur` still passes through via `rest`.
    void onChange;
    const handleChange = (values: any, sourceInfor: any) => {
      if (onValueChange) onValueChange?.(values, sourceInfor);
    };
    return (
      <NumericFormat
        customInput={TextInput}
        thousandSeparator={thousandSeparator}
        {...(rest as any)}
        displayType={displayType}
        prefix={prefix}
        onValueChange={handleChange}
        ref={ref}
        style={{ textAlign: "right", ...style }}
      />
    );
  },
);
