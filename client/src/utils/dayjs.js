import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import localizedFormat from "dayjs/plugin/localizedFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import updateLocale from "dayjs/plugin/updateLocale";
import "dayjs/locale/vi";

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

dayjs.extend(updateLocale);
dayjs.updateLocale("vi", {
  weekStart: 1
});

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(advancedFormat);
dayjs.extend(isoWeek);

dayjs.locale("vi");
dayjs.tz.setDefault(VIETNAM_TZ);

export const toVietnamTime = (value) => {
  const base = value !== undefined && value !== null ? dayjs(value) : dayjs();
  return base.tz(VIETNAM_TZ);
};

export const formatVietnamDate = (value, format = "DD/MM/YYYY") =>
  toVietnamTime(value).format(format);

export const formatVietnamDateTime = (
  value,
  format = "DD/MM/YYYY HH:mm"
) => toVietnamTime(value).format(format);

export const formatVietnamTime = (value, format = "HH:mm") =>
  toVietnamTime(value).format(format);

export const VIETNAM_TIMEZONE = VIETNAM_TZ;

export default dayjs;
