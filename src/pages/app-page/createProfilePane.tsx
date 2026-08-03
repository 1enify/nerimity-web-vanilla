import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@trans";

import { Avatar } from "../../components/avatar";
import { Banner } from "../../components/Banner";
import { Button } from "../../components/button";
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
import { friendStore } from "../../store/friendStore";
import { inboxStore } from "../../store/inboxStore";
import { serverStore } from "../../store/serverStore";
import { userPresenceStore } from "../../store/userPresenceStore";
import { User, userStore } from "../../store/userStore";
import { FriendStatus } from "../../Types";
import { hasBit } from "../../utils/bitwise";
import { createWidthQuery } from "../../utils/createWidthQuery";
import { formatTimestamp, getDaysAgo } from "../../utils/date";
import { storeEmitter } from "../../utils/EventEmitter";
import { FocusAnimator } from "../../utils/FocusAnimator";
import { getFont } from "../../utils/font";
import { getRecentServerChannelId } from "../../utils/recentServerChannels";
import { router } from "../../utils/router";
import { UserBadgeValues, type UserBadge } from "../../utils/UserBadgeFlag";

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

  return (
    <div class={style.content}>
      <div class={style.banner}>
        <Banner user={user} />
      </div>
      <div class={style.overlayInfo}>
        <Avatar user={user} size={128} />
      </div>
      <Actions details={userDetails} user={opts.user} signal={signal} />
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
        <Badges user={userDetails?.user || user} />
        <Stats details={userDetails} />

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

const Actions = ({
  user,
  details,
  signal,
}: {
  user?: User;
  details?: UserDetails;
  signal: AbortSignal;
}) => {
  const isFollowing = !!details?.user.followers.length;
  const friend = friendStore.friends.get(user?.id!);

  const isCurrent = accountStore.currentUser?.id === user?.id;
  const bot = user?.bot;

  const getFriendButtonState = () => {
    const blocked = friend?.status === FriendStatus.BLOCKED;
    const pending = friend?.status === FriendStatus.PENDING;
    const sent = friend?.status === FriendStatus.SENT;
    const friends = friend?.status === FriendStatus.FRIENDS;

    if (blocked) return { action: "unblock", icon: "block", label: t`Unblock` };
    if (pending)
      return {
        action: "accept_friend",
        icon: "check",
        label: t`Accept Request`,
      };
    if (sent)
      return {
        action: "remove_request",
        icon: "close",
        label: t`Remove Request`,
        alert: true,
      };
    if (friends)
      return {
        action: "remove_friend",
        icon: "person_add_disabled",
        label: t`Remove Friend`,
        alert: true,
      };
    return { action: "add_friend", icon: "group_add", label: t`Add Friend` };
  };

  const friendButtonState = getFriendButtonState();
  const el = (
    <div class={style.actions}>
      <div class={style.actionsInner}>
        {isFollowing && (
          <ActionButton
            action="unfollow"
            alert
            icon="do_not_disturb_on"
            label={t`Unfollow`}
          />
        )}
        {!isFollowing && !isCurrent && (
          <ActionButton action="follow" icon="add_circle" label={t`Follow`} />
        )}
        {!bot && !isCurrent && <ActionButton {...friendButtonState} />}
        <ActionButton
          action="message"
          icon="mail"
          label={isCurrent ? t`Notes` : t`Message`}
        />
        <ActionButton action="" icon="more_horiz" />
      </div>
    </div>
  ) as HTMLDivElement;

  el.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLDivElement;
      const button = target.closest("[data-action]") as HTMLDivElement;
      const action = button.dataset?.action;
      if (action === "message") {
        inboxStore.openChannel(user?.id!);
      }
    },
    { signal },
  );

  return el;
};

const ActionButton = (props: {
  icon?: string;
  label?: string;
  alert?: boolean;
  action: string;
}) => {
  return (
    <Button
      hoverBorder
      data-action={props.action}
      label={props.label}
      icon={props.icon}
      alert={props.alert}
    />
  );
};

const Stats = ({ details }: { details?: UserDetails }) => {
  const followers = details?.user._count?.followers;
  const following = details?.user._count?.following;

  const hideFollowers = details?.hideFollowers;
  const hideFollowing = details?.hideFollowing || details?.user.bot;
  const showStats = details && (!hideFollowers || !hideFollowing);

  if (!showStats) return null;

  return (
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
  );
};

const BadgeItem = (props: { badge: UserBadge }) => {
  return (
    <div
      data-bit={props.badge.bit}
      style={{ background: props.badge.color, color: props.badge.textColor }}
      class={style.badgeItem}
    >
      {props.badge.icon && <Icon class={style.icon} name={props.badge.icon} />}
      {props.badge.name()}
    </div>
  );
};

const Badges = (props: { user: User }) => {
  const enabledBadges = UserBadgeValues.filter((b) =>
    hasBit(props.user.badges, b.bit),
  );

  if (!enabledBadges.length) return null;
  let earnedBadges: UserBadge[] = [];
  let otherBadges: UserBadge[] = [];

  for (let i = 0; i < enabledBadges.length; i++) {
    const badge = enabledBadges[i]!;
    if (badge.type === "earned") {
      earnedBadges.push(badge);
    } else {
      otherBadges.push(badge);
    }
  }

  const showSeparator = !!(earnedBadges.length && otherBadges.length);

  return (
    <div class={style.badgesContainer}>
      {earnedBadges.map((b) => (
        <BadgeItem badge={b} />
      ))}
      {showSeparator && <div class={style.separator} />}
      {otherBadges.map((b) => (
        <BadgeItem badge={b} />
      ))}
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

  const bot = opts.userDetails?.user.bot;

  return (
    <div class={style.sidebar}>
      <SidebarJoined user={opts.user} signal={signal} />
      {bot && <SidebarBotCreator details={opts.userDetails!} />}
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

const SidebarBotCreator = (opts: { details: UserDetails }) => {
  const user = opts.details.user.application?.creatorAccount.user as User;
  return (
    <div class={[style.sidebarItem, style.mutual, style.botCreator]}>
      <div class={style.title}>
        <Icon name="group" class={style.icon} />
        {t`Bot Creator`}
      </div>
      <div class={style.mutualList}>
        <MutualItem user={user!} />
      </div>
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

const MutualItem = (props: {
  userId?: string;
  serverId?: string;
  user?: User;
}) => {
  const user = userStore.users.get(props.userId!) || props.user;
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
