import type { Profile, RawUser, RawUserPresence } from "../Types";
import { request } from "./request";

interface GetUserDetailsOpts {
  userId: string;
}

export type UserDetails = {
  blocked: boolean;
  followsYou: boolean;
  hideFollowers: boolean;
  hideFollowing: boolean;
  profile?: Profile;
  mutualFriendIds: string[];
  mutualServerIds: string[];
  user: RawUser & {
    following: any[];
    followers: any[];
    _count: {
      followers: number;
      following: number;
      likedPosts: number;
      posts: number;
    };
  };
};

export const getUserDetails = async (opts: GetUserDetailsOpts) => {
  return request<UserDetails>(`/users/${opts.userId}`, {
    method: "GET",
    useToken: true,
  });
};
export const userLogout = async () => {
  return request<any>(`/users/logout`, {
    method: "DELETE",
    useToken: true,
  });
};

export async function updatePresence(presence: Partial<RawUserPresence>) {
  return request("/users/presence", {
    method: "POST",
    body: presence,
    useToken: true,
  });
}
