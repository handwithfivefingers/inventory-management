import React, { HTMLInputTypeAttribute, forwardRef, useRef } from "react";
import { cn } from "~/libs/utils";
import { BaseProps } from "~/types/common";
import styles from "./styles.module.scss";
// export const TextInput = () => {
//   return (
//     <div>
//       <label htmlFor="price" className="block text-sm/6 font-medium text-gray-900">
//         Price
//       </label>
//       <div className="relative mt-2 rounded-md shadow-sm">
//         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
//           <span className="text-gray-500 sm:text-sm">$</span>
//         </div>
//         <input
//           type="text"
//           name="price"
//           id="price"
//           className="block w-full rounded-md border-0 py-1.5 pl-7 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
//           placeholder="0.00"
//         />
//         <div className="absolute inset-y-0 right-0 flex items-center">
//           <label htmlFor="currency" className="sr-only">
//             Currency
//           </label>
//           <select
//             id="currency"
//             name="currency"
//             className="h-full rounded-md border-0 bg-transparent py-0 pl-2 pr-7 text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
//           >
//             <option>USD</option>
//             <option>CAD</option>
//             <option>EUR</option>
//           </select>
//         </div>
//       </div>
//     </div>
//   );
// };
export interface ITextInput extends BaseProps, React.InputHTMLAttributes<HTMLInputTypeAttribute> {
  label?: string;
  name?: string;
  prefix?: string | React.ReactNode | any;
  placeholder?: string;
  value?: string;
  type?: string | undefined | any;
}

export const TextInput = forwardRef<HTMLInputElement, ITextInput>(
  ({ label, name, prefix, placeholder, className, style, onChange, ...rest }, ref) => {
    const prefixRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    return (
      <div className={styles.inputWrapper}>
        {label ? (
          <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900">
            {label}
          </label>
        ) : (
          ""
        )}
        <div className={cn("relative rounded-md flex items-center py-1.5 px-1 pl-2 ")}>
          {prefix && (
            <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-1 z-[1]">
              <span className="text-gray-500 sm:text-sm" ref={prefixRef}>
                {prefix}
              </span>
            </div>
          )}
          <input
            name={name}
            id={name}
            className={cn(
              "block w-full bg-transparent rounded-md border-0   text-gray-900  placeholder:text-gray-400  sm:text-sm/6 outline-none px-1",
              styles.input
            )}
            placeholder={placeholder}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            ref={ref}
            // onChange={(e) => onChange?.(e.target.value as any)}
            onChange={(e) => onChange?.(e as any)}
          />
          <div
            className={cn(
              "absolute rounded-md left-0 top-0 w-full h-full ring-1 ring-gray-300  -z-[1] shadow-sm bg-white",
              styles.outline,
              className
            )}
          />

          {/* <div className="absolute inset-y-0 right-0 flex items-center">
          <label htmlFor="currency" className="sr-only">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            className="h-full rounded-md border-0 bg-transparent py-0 pl-2 pr-7 text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
          >
            <option>USD</option>
            <option>CAD</option>
            <option>EUR</option>
          </select>
        </div> */}
        </div>
      </div>
    );
  }
);
