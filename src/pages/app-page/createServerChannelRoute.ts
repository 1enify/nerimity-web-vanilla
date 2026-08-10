import { Drawer } from "../../components/drawer";
import { createServerMemberList } from "../../components/server-right-drawer/serverRightDrawer";
import { createServerChannelList } from "../../components/serverChannelList";
import { serverStore } from "../../store/serverStore";
import { storeEmitter } from "../../utils/EventEmitter";

const createServerChannelRoute = (leftDrawer: HTMLElement) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const serverChannelList = createServerChannelList();
  const serverMemberList = createServerMemberList();
  const drawer = Drawer();

  leftDrawer.replaceChildren(serverChannelList.render());

  drawer.rightDrawer.replaceChildren(serverMemberList.render());

  serverStore.currentServerSortedRoles.rerun();
  serverStore.currentChannelsSorted.rerun();
  storeEmitter.on(
    "ws:authStateUpdate",
    (state) => {
      if (!state) return;
      serverStore.currentServerSortedRoles.rerun();
      serverStore.currentChannelsSorted.rerun();
    },
    signal,
  );

  const destroy = () => {
    abortController.abort();
    serverChannelList.destroy();
    serverMemberList.destroy();
  };

  return { destroy };
};

export default createServerChannelRoute;
