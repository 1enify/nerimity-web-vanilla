import type { FullAttachment } from "../Types";
import { request } from "./request";

export const postTyping = async (channelId: string) => {
  return request(`/channels/${channelId}/typing`, {
    useToken: true,
    method: "POST",
    text: true,
  });
};
export const getAttachments = async (channelId: string) => {
  return request<FullAttachment[]>(
    `/channels/${channelId}/attachments?limit=50`,
    {
      useToken: true,
      method: "GET",
    },
  );
};
