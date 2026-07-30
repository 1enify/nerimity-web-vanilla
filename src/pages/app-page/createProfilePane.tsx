import { t } from "@lingui/core/macro";
import { Trans } from "@trans";

import { Avatar } from "../../components/avatar";
import { Banner } from "../../components/Banner";
import { Drawer } from "../../components/drawer";
import { Markup } from "../../components/markup/markup";
import { ServerClanItem } from "../../components/serverClanItem";
import { UserPresence } from "../../components/userPresence";
import { h } from "../../h";
import { getUserDetails, type UserDetails } from "../../services/userService";
import { User, userStore } from "../../store/userStore";
import { createWidthQuery } from "../../utils/createWidthQuery";
import { formatTimestamp, getDaysAgo } from "../../utils/date";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { getFont } from "../../utils/font";
import { router } from "../../utils/router";

import style from "./createProfilePane.module.css";

let contentAbortController: AbortController | undefined = undefined;
let sidebarAbortController: AbortController | undefined = undefined;

const Content = (opts: {
  userDetails?: UserDetails;
  user?: User;
  mobile: boolean;
}) => {
  const { userDetails, user } = opts;
  contentAbortController?.abort();
  contentAbortController = new AbortController();

  const { signal } = contentAbortController;

  if (!user) return null;
  const font = getFont(user?.profile?.font || userDetails?.profile?.font);

  const presenceContainer = (<div></div>) as HTMLDivElement;

  const renderPresence = () =>
    presenceContainer.replaceChildren(
      <UserPresence showOffline userId={user.id} hideActivity />,
    );
  renderPresence();

  storeEmitter.on(
    "user:presence_update",
    (event) => {
      if (event.userId !== user.id) return;
      renderPresence();
    },
    signal,
  );

  const followers = userDetails?.user._count?.followers;
  const following = userDetails?.user._count?.following;

  const hideFollowers = userDetails?.hideFollowers;
  const hideFollowing = userDetails?.hideFollowing || user?.bot;
  const showStats = userDetails && (!hideFollowers || !hideFollowing);

  return (
    <div class={style.content}>
      <div class={style.banner}>
        <Banner user={user} />
      </div>
      <div class={style.overlayInfo}>
        <Avatar user={user} size={128} />
      </div>
      <div class={[style.section, style.detailsSection]}>
        <div class={style.nameAndTag}>
          <span class={[style.username, font?.class, "font"]}>
            {user.username}
          </span>
          <span class={style.tag}>:{user.tag}</span>
          {userDetails?.profile?.clan && (
            <span class={style.clan}>
              <ServerClanItem clan={userDetails?.profile?.clan} />
            </span>
          )}
        </div>
        {presenceContainer}
        {showStats && (
          <div class={style.stats}>
            {!hideFollowers && (
              <span class={style.stat}>
                <Trans>
                  <span class={style.full}>{followers}</span> Followers
                </Trans>
              </span>
            )}
            {!hideFollowing && (
              <span class={style.stat}>
                <Trans>
                  <span class={style.full}>{following}</span> Following
                </Trans>
              </span>
            )}
          </div>
        )}

        {userDetails?.profile?.bio && (
          <div class={style.bio}>
            <Markup text={userDetails?.profile?.bio} />
          </div>
        )}
      </div>
      {opts.mobile && <Sidebar {...opts} />}
    </div>
  );
};
const Sidebar = (opts: { userDetails?: UserDetails; user?: User }) => {
  sidebarAbortController?.abort();
  sidebarAbortController = new AbortController();
  const { signal } = sidebarAbortController;

  return (
    <div class={style.sidebar}>
      <SidebarJoined user={opts.user} signal={signal} />
    </div>
  );
};

const SidebarJoined = (opts: { user?: User; signal: AbortSignal }) => {
  let fullDate = true;
  const infoEl = (<div class={style.info}></div>) as HTMLDivElement;

  const el = (
    <div class={[style.sidebarItem, style.joinedAtItem]}>
      <div class={style.title}>{t`Joined Nerimity`}</div>
      {infoEl}
    </div>
  ) as HTMLDivElement;

  const toggle = () => {
    const joinedAt = opts.user?.joinedAt || 0;
    fullDate = !fullDate;
    infoEl.replaceChildren(
      fullDate ? formatTimestamp(joinedAt) : getDaysAgo(joinedAt),
    );
  };
  toggle();

  el.addEventListener("click", toggle, { signal: opts.signal });

  return el;
};

const createProfilePane = (content: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let localUser: undefined | User = undefined;
  let userDetails: undefined | UserDetails = undefined;

  const widthQuery = createWidthQuery(1220);

  const getUser = () => userDetails?.user || localUser;

  const focusAnim = new FocusAnimator(content, "img");

  const rerender = () => {
    if (signal.aborted) return;
    const desktop = widthQuery.matches;

    let el = (
      <div class={[style.container, !desktop && style.mobile]}>
        <Content user={getUser()} userDetails={userDetails} mobile={!desktop} />
        {desktop && <Sidebar user={getUser()} userDetails={userDetails} />}
      </div>
    ) as HTMLDivElement;

    const colorOne = userDetails?.profile?.bgColorOne || "#000000";
    const colorTwo = userDetails?.profile?.bgColorTwo || "#000000";

    const bg = `linear-gradient(180deg, ${colorOne}, ${colorTwo})`;

    if (content.parentElement) {
      if (userDetails?.profile?.primaryColor) {
        content.parentElement.style.setProperty(
          "--primary-color",
          userDetails.profile.primaryColor,
        );
      }
      content.parentElement.style.background = bg;
    }

    content.replaceChildren(el);
    focusAnim.trigger();
  };

  storeEmitter.on("ws:authStateUpdate", rerender, signal);

  router.createMatchListener<{ userId: string }>(
    "/app/profile/:userId",
    async (res) => {
      const userId = res?.params.userId;
      if (!userId) return rerender();
      localUser = userStore.users.get(userId);
      rerender();

      const [details, error] = await getUserDetails({ userId });
      if (error) return;
      userDetails = details;
      rerender();
    },
    { signal },
  );

  widthQuery.onModeChange(rerender, signal);

  signal.addEventListener(
    "abort",
    () => {
      requestAnimationFrame(() => {
        Drawer().content.style.background = "";
        Drawer().content.style.removeProperty("--primary-color");
      });
    },
    { once: true },
  );

  const destroy = () => {
    focusAnim.destroy();

    contentAbortController?.abort();
    sidebarAbortController?.abort();
    abortController.abort();
    (content as any) = null;
  };

  return { destroy };
};

export default createProfilePane;
