import { forwardRef } from "react";
import { NumberInput } from "../number-input";
import { TMButton } from "~/components/tm-button";
import { Icon } from "~/components/icon";

interface Props {
  value?: string | number;
  onValueChange?: (v: { value: number | string; float?: number }) => void;
  disabled?: boolean;
  /** Increment/decrement amount (e.g. settings.moneyStep for pricing) */
  step?: number;
  label?: string;
}

/**
 * NumberInput with -/+ stepper buttons, matching the quantity control used
 * in the order-details lines.
 */
export const NumberStepper = forwardRef<HTMLDivElement, Props>(
  ({ value, onValueChange, disabled, step = 1, label }, ref) => {
    const change = (direction: number) => {
      const current = Number(value ?? 0);
      const next = direction > 0 ? current + step : current > 0 ? Math.max(0, current - step) : 0;
      onValueChange?.({ value: next });
    };
    return (
      <div ref={ref} className="flex gap-1 rounded items-end">
        <NumberInput
          label={label}
          value={value as any}
          onValueChange={(v) => onValueChange?.(v)}
          disabled={disabled}
          style={{ margin: 0 }}
        />
        {/* Fixed height so the +/- buttons align with the input only,
            instead of stretching over the label area above it */}
        <div className="flex h-7 self-end">
          <TMButton
            size="xs"
            onClick={() => change(-1)}
            disabled={disabled}
            style={{ borderRadius: "4px 0 0 4px", height: "100%" }}
            className="px-1.5"
          >
            <Icon name="minus" fontSize={16} />
          </TMButton>
          <TMButton
            size="xs"
            onClick={() => change(1)}
            disabled={disabled}
            style={{ borderRadius: "0 4px 4px 0", height: "100%" }}
            className="px-1.5"
          >
            <Icon name="plus" fontSize={16} />
          </TMButton>
        </div>
      </div>
    );
  },
);

NumberStepper.displayName = "NumberStepper";
