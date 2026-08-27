import { Icon } from "../icon";

export const Loader = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 z-1">
      <Icon name="loader" className="animate-spin text-indigo-500 dark:text-indigo-300" />
    </div>
  );
};
