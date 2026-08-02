import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { Avatar } from "../../components/avatar";
import { Banner } from "../../components/Banner";
import { Drawer } from "../../components/drawer";
import { Icon } from "../../components/icon";
import { Link } from "../../components/link";
import { Markup } from "../../components/markup/markup";
import { ServerClanItem } from "../../components/serverClanItem";
import { updateActivity, UserActivity } from "../../components/UserActivity";
import { UserPresence } from "../../components/userPresence";
import { Dynamic } from "../../dynamic";
import { h, Fragment } from "../../h";
import { getUserDetails, type UserDetails } from "../../services/userService";
import { accountStore } from "../../store/accountStore";
import { serverStore } from "../../store/serverStore";
import { userPresenceStore } from "../../store/userPresenceStore";
import { User, userStore } from "../../store/userStore";
import { createWidthQuery } from "../../utils/createWidthQuery";
import { formatTimestamp, getDaysAgo } from "../../utils/date";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { getFont } from "../../utils/font";
import { getRecentServerChannelId } from "../../utils/recentServerChannels";
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
          <span class={style.badges}>
            {userDetails?.profile?.clan && (
              <span class={style.clan}>
                <ServerClanItem clan={userDetails?.profile?.clan} />
              </span>
            )}
            {userDetails?.followsYou && (
              <span class={style.followsYou}>{t`Follows You`}</span>
            )}
          </span>
        </div>
        {presenceContainer}
        {showStats && (
          <div class={style.stats}>
            {!hideFollowers && (
              <span class={style.stat}>
                <Plural
                  value={followers || 0}
                  _0={
                    <Trans>
                      <span class={style.full}>No</span> Followers
                    </Trans>
                  }

                  one={
                    <Trans>
                      <span class={style.full}>#</span> Follower
                    </Trans>
                  }
                  other={
                    <Trans>
                      <span class={style.full}>#</span> Followers
                    </Trans>
                  }
                />
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
      {opts.mobile && <Sidebar {...opts} mobile />}
    </div>
  );
};
const Sidebar = (opts: {
  mobile?: boolean;
  userDetails?: UserDetails;
  user?: User;
}) => {
  sidebarAbortController?.abort();
  sidebarAbortController = new AbortController();
  const { signal } = sidebarAbortController;

  const isCurrentUser = accountStore.currentUser?.id === opts.user?.id;

  return (
    <div class={style.sidebar}>
      <SidebarJoined user={opts.user} signal={signal} />
      <SidebarActivity user={opts.user} signal={signal} />
      {!isCurrentUser && (
        <>
          <MutualList
            friendIds={opts.userDetails?.mutualFriendIds}
            signal={signal}
            mobile={opts.mobile}
          />
          <MutualList
            serverIds={opts.userDetails?.mutualServerIds}
            signal={signal}
            mobile={opts.mobile}
          />
        </>
      )}
    </div>
  );
};

const MutualList = (opts: {
  friendIds?: string[];
  serverIds?: string[];
  signal: AbortSignal;
  mobile?: boolean;
}) => {
  let collapsed = !!opts.mobile;

  if (!opts.friendIds?.length && !opts.serverIds?.length) return null;

  let itemsEl = (<div class={style.mutualList}></div>) as HTMLDivElement;

  let titleEl = (
    <div class={style.title}>
      <Icon name="group" class={style.icon} />
      {opts.friendIds ? t`Mutual Friends` : t`Mutual Servers`}
      <Icon class={style.expandIcon} name="keyboard_arrow_down" />
    </div>
  );

  const el = (
    <div class={[style.sidebarItem, style.mutual]}>
      {titleEl}
      {itemsEl}
    </div>
  ) as HTMLDivElement;

  const rerender = () => {
    el.classList.toggle(style.expanded!, collapsed);
    itemsEl.style.display = collapsed ? "none" : "flex";
    itemsEl.replaceChildren(
      <>
        {!collapsed && opts.friendIds?.map((id) => <MutualItem userId={id} />)}
        {!collapsed &&
          opts.serverIds?.map((id) => <MutualItem serverId={id} />)}
      </>,
    );
  };
  rerender();

  titleEl.addEventListener(
    "click",
    () => {
      collapsed = !collapsed;
      rerender();
    },
    { signal: opts.signal },
  );

  return el;
};

const MutualItem = (props: { userId?: string; serverId?: string }) => {
  const user = userStore.users.get(props.userId!);
  const server = serverStore.servers.get(props.serverId!);
  if (!user && !server) return null;

  const name = user?.username || server?.name;
  const font = user ? getFont(user?.profile?.font) : undefined;

  return (
    <Dynamic
      component={Link}
      data-no-mini={!!user}
      data-user-id={user?.id}
      href={
        user
          ? `/app/profile/${user.id}`
          : `/app/servers/${server?.id}/${getRecentServerChannelId(server?.id!)}`
      }
      class={style.mutualItem}
    >
      <Avatar size={26} server={server} user={user} />
      <span class={[font?.class, "font"]}>{name}</span>
    </Dynamic>
  );
};

const SidebarJoined = (opts: { user?: User; signal: AbortSignal }) => {
  let fullDate = true;
  const infoEl = (<div class={style.info}></div>) as HTMLDivElement;

  const el = (
    <div class={[style.sidebarItem, style.joinedAtItem]}>
      <div class={style.title}>
        <Icon name="calendar_month" class={style.icon} />
        {t`Joined Nerimity`}
      </div>
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
const SidebarActivity = (props: { user?: User; signal: AbortSignal }) => {
  let activitiesContainer = (
    <div class={style.activities}></div>
  ) as HTMLDivElement;

  const rerender = () => {
    const presence = userPresenceStore.presences.get(props.user?.id!);
    const activities = presence?.activities || [];
    activitiesContainer.replaceChildren(
      ...activities.map((activity) => (
        <UserActivity
          class={style.sidebarItem + " " + style.activity}
          activity={activity}
          userId={props.user?.id!}
        />
      )),
    );
  };
  rerender();

  const intervalId = setInterval(() => {
    const activitiesEl = document.querySelector(`.${style.activities}`);
    if (!activitiesEl) return;

    const activities = [...activitiesEl.children!];
    for (let i = 0; i < activities.length; i++) {
      const activityEl = activities[i] as HTMLDivElement;
      updateActivity(activityEl);
    }
  }, 1000);
  props.signal.addEventListener("abort", () => clearInterval(intervalId), {
    once: true,
  });

  rerender();
  storeEmitter.on(
    "user:presence_update",
    (event) => {
      if (event.userId !== props.user?.id!) return;
      rerender();
    },
    props.signal,
  );

  return activitiesContainer;
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

    if (content.parentElement && userDetails) {
      if (userDetails?.profile?.primaryColor) {
        content.parentElement.style.setProperty(
          "--primary-color",
          userDetails.profile.primaryColor,
        );
      }
      Drawer().content.style.setProperty("--content-bg-color", bg);
      Drawer().content.classList.add("showBg");
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
        Drawer().content.classList.remove("showBg");
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

    content.replaceChildren();
    (content as any) = null;
  };

  return { destroy };
};

export default createProfilePane;
