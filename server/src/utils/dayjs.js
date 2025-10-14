import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import isoWeek from "dayjs/plugin/isoWeek.js";
import advancedFormat from "dayjs/plugin/advancedFormat.js";
import localizedFormat from "dayjs/plugin/localizedFormat.js";
import updateLocale from "dayjs/plugin/updateLocale.js";
import "dayjs/locale/vi.js";

dayjs.extend(updateLocale);
dayjs.updateLocale("vi", { weekStart: 1 });

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

dayjs.locale("vi");
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

export default dayjs;
