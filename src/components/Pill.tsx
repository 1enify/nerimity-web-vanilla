import morphdom from "morphdom";

import { h } from "../h";
import { Channel } from "../store/channelStore";
import type { Server } from "../store/serverStore";
import type { User } from "../store/userStore";
import { Avatar } from "./avatar";
import { CdnIcon } from "./cdnIcon";
import { Icon } from "./icon";

import style from "./Pill.module.css";

export const Pill = ({
  warn,
  error,
  icon,
  server,
  user,
  channel,
  label,
}: {
  warn?: boolean;
  error?: boolean;
  icon?: string | null;
  server?: Server;
  user?: User | null;
  channel?: Channel;
  label?: string;
}) => {
  const isServerChannel = !!channel?.serverId;
  return (
    <div class={style.pill}>
      {icon ? (
        <Icon
          name={icon}
          class={[style.icon, warn && style.warn, error && style.error]}
        />
      ) : (
        <Avatar size={24} server={server} user={user} />
      )}
      {isServerChannel ? (
        <CdnIcon channel={channel} size={14} class={style.channelIcon} />
      ) : null}
      <div class={style.label}>{label}</div>
    </div>
  );
};

export const createPillUpdater = (
  pillContainer: () => HTMLDivElement,
  pill: () => any,
) => {
  let pendingAnim: Animation | null = null;
  const updatePill = () => {
    const pillEl = pillContainer().querySelector(
      `.${style.pill}`,
    ) as HTMLElement;

    const oldWidth = pillEl.getBoundingClientRect().width;
    const oldHTML = pillEl.innerHTML;

    morphdom(pillEl, pill());

    if (pillEl.innerHTML === oldHTML) return;

    pendingAnim?.cancel();
    pendingAnim = null;

    const newLabelEl = pillEl.querySelector("." + style.label) as HTMLElement;
    const newWidth = pillEl.getBoundingClientRect().width;

    if (oldWidth !== newWidth) {
      newLabelEl.style.textOverflow = "clip";
      pillEl.animate([{ width: `${oldWidth}px` }, { width: `${newWidth}px` }], {
        duration: 200,
        easing: "ease",
        fill: "none",
      }).onfinish = () => {
        newLabelEl.removeAttribute("style");
      };
    }

    pendingAnim = newLabelEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 260,
      easing: "ease",
      fill: "forwards",
    });
    pendingAnim.onfinish = () => {
      pendingAnim = null;
    };
  };
  return updatePill;
};
