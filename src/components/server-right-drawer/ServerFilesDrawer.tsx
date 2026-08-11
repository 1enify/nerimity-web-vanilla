import { h, Fragment } from "../../h";
import { getAttachments } from "../../services/channelService";
import { channelStore } from "../../store/channelStore";
import type { FullAttachment } from "../../Types";
import { buildImageUrl } from "../../utils/image";
import { Icon } from "../icon";
import { Link } from "../link";

import style from "./ServerFilesDrawer.module.css";

const AttachmentItem = (props: { attachment: FullAttachment }) => {
  const isImage = !!props.attachment.width || !!props.attachment.height;

  const [attachmentUrl] = buildImageUrl(props.attachment.path, { size: 300 });

  const messageId = props.attachment.messageId!;

  return (
    <Link
      href={location.pathname + "?messageId=" + messageId}
      class={style.item}
    >
      <div class={style.overlay}>
        <Icon name="visibility" class={style.icon} />
      </div>
      {isImage && attachmentUrl ? (
        <img class={style.image} src={attachmentUrl} />
      ) : (
        <Icon name="attach_file" class={style.icon} />
      )}
    </Link>
  );
};

export const createFilesDrawer = () => {
  let filesContainerEl = (
    <div class={style.container}></div>
  ) as HTMLDivElement;

  let attachments: FullAttachment[] | null = null;

  const render = () => {
    return filesContainerEl;
  };

  const loadAttachments = async () => {
    const channelId = channelStore.currentChannelId!;
    const [newAttachments] = await getAttachments(channelId);

    attachments = newAttachments;
    if (!attachments) return;

    filesContainerEl.replaceChildren(
      <>
        {attachments.map((attach) => (
          <AttachmentItem attachment={attach} />
        ))}
      </>,
    );
  };

  loadAttachments();

  const destroy = () => {
    attachments = null;
    filesContainerEl.remove();
    (filesContainerEl as any) = null;
  };

  return {
    destroy,
    render,
  };
};
