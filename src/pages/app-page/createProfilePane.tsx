import { h } from "../../h";

const createProfilePane = (content: HTMLElement) => {
  const abortController = new AbortController();
  // const { signal } = abortController;
  let el = (
    <div>
      <div>Profile Pane</div>
    </div>
  ) as HTMLDivElement;

  content.replaceChildren(el);

  const destroy = () => {
    el.remove();
    (el as any) = null;
    abortController.abort();
    (content as any) = null;
  };

  return { destroy };
};

export default createProfilePane;
