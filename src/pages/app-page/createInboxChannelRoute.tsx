import { Drawer } from "../../components/drawer";
import createInboxDrawer from "../../components/inboxDrawer";
import { createRightDrawer } from "../../components/right-drawer/RightDrawer";

const createInboxChannelRoute = (leftDrawer: HTMLElement) => {
  const abortController = new AbortController();

  const inboxDrawer = createInboxDrawer();
  const rightDrawer = createRightDrawer();

  let drawer = Drawer();

  leftDrawer.replaceChildren(inboxDrawer.render());

  let miniProfileAbortController = new AbortController();
  drawer.rightDrawer.replaceChildren(rightDrawer.render());

  // const renderRightDrawer = () => {
  //   miniProfileAbortController.abort();
  //   miniProfileAbortController = new AbortController();
  //   if (!accountStore.authenticated) return;
  //   const inbox = inboxStore.inboxes.get(channelStore.currentChannelId!);

  //   const recipientId = inbox?.recipientId;
  //   if (!recipientId) return;

  //   drawer.rightDrawer.replaceChildren(
  //     <MiniProfile
  //       animationMode="hover"
  //       abort={miniProfileAbortController}
  //       class={style.miniProfileDrawer}
  //       userId={recipientId}
  //     />,
  //   );
  // };

  // renderRightDrawer();

  // storeEmitter.on(
  //   "navigate:channelId",
  //   () => {
  //     renderRightDrawer();
  //   },
  //   signal,
  // );
  // storeEmitter.on(
  //   "ws:authStateUpdate",
  //   (state) => {
  //     if (!state) return;
  //     renderRightDrawer();
  //   },
  //   signal,
  // );

  const destroy = () => {
    miniProfileAbortController.abort();
    drawer.rightDrawer.replaceChildren();
    abortController.abort();
    inboxDrawer.destroy();
    rightDrawer.destroy();
    (leftDrawer as any) = null;
    (drawer as any) = null;
  };

  return { destroy };
};

export default createInboxChannelRoute;
