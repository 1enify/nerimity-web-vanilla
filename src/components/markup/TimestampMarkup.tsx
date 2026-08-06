import { h } from "../../h";
import { formatTimestampRelative } from "../../utils/date";
import { Mention } from "./Mention";

export const TimestampType = {
  tr: "RELATIVE",
  to: "OFFSET",
};

export const TimestampMarkup = (props: {
  type: keyof typeof TimestampType;
  timestamp: number;
}) => {
  return (
    <Mention
      data-timestamp-mention
      data-type={props.type}
      data-timestamp={props.timestamp}
      label=""
      icon="schedule"
    />
  );
};

const updateAll = (el: HTMLElement) => {
  const items = el.querySelectorAll("[data-timestamp-mention]");
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as HTMLDivElement;
    const { type, timestamp } = item.dataset;

    const text = item.querySelector(".text") as HTMLDivElement;
    if (type === "tr") {
      text.innerText = formatTimestampRelative(parseInt(timestamp!));
    }
  }
};

export const handleTimestampMarkupEvents = (opts: {
  el: HTMLElement;
  signal: AbortSignal;
}) => {
  updateAll(opts.el);
  const intervalId = setInterval(() => updateAll(opts.el), 1000);

  opts.signal.addEventListener(
    "abort",
    () => {
      clearInterval(intervalId);
    },
    { once: true },
  );
};
