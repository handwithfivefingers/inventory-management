import { Portal } from "../portal";
import styles from "./styles.module.scss";
export const Loading = () => {
  return (
    <Portal>
      <div className={styles.preload}>
        <div className={styles.loader}></div>
      </div>
    </Portal>
  );
};
