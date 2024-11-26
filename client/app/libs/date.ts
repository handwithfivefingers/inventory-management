import dayjsInstance, { Dayjs } from "dayjs";
// import Dayjs from "dayjs";
import UTC from "dayjs/plugin/utc";
const dayjs: Dayjs | any = dayjsInstance.extend(UTC);
export { dayjs };
