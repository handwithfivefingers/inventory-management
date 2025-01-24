import { cn } from "~/libs/utils";
import { Portal } from "../portal";
import styles from "./styles.module.scss";
export const Loading = () => {
  return (
    <Portal>
      <div className={cn("animate__animated animate__fadeIn", styles.preload)}>
        <div className={styles.loader}></div>
      </div>
    </Portal>
  );
};
