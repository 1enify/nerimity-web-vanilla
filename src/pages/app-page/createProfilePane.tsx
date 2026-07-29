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
import { storeEmitter } from "../../utils/EventEmitter";
import { getFont } from "../../utils/font";
import { router } from "../../utils/router";

import style from "./createProfilePane.module.css";

const createProfilePane = (content: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let localUser: undefined | User = undefined;
  let userDetails: undefined | UserDetails = undefined;

  const getUser = () => userDetails?.user || localUser;

  let contentAbortController: AbortController | undefined = undefined;

  const Content = () => {
    contentAbortController?.abort();
    contentAbortController = new AbortController();

    const { signal } = contentAbortController;

    const user = getUser();
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
      </div>
    );
  };
  const Sidebar = () => {
    return <div class={style.sidebar}>Sidebar</div>;
  };

  const rerender = () => {
    if (signal.aborted) return;

    let el = (
      <div class={style.container}>
        <Content />
        <Sidebar />
      </div>
    ) as HTMLDivElement;

    if (userDetails?.profile?.primaryColor) {
      el.style.setProperty("--primary-color", userDetails.profile.primaryColor);
    }

    const colorOne = userDetails?.profile?.bgColorOne || "#000000";
    const colorTwo = userDetails?.profile?.bgColorTwo || "#000000";

    const bg = `linear-gradient(180deg, ${colorOne}, ${colorTwo})`;

    if (content.parentElement) {
      content.parentElement.style.background = bg;
    }

    content.replaceChildren(el);
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

  signal.addEventListener(
    "abort",
    () => {
      requestAnimationFrame(() => {
        Drawer().content.style.background = "";
      });
    },
    { once: true },
  );

  const destroy = () => {
    contentAbortController?.abort();
    abortController.abort();
    (content as any) = null;
  };

  return { destroy };
};

export default createProfilePane;
