"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { togglePostLike } from "@/lib/firestore";
import type { Post } from "@/types";

/**
 * Shared optimistic-like logic for PostCard and SocietyPostCard.
 * Manages instant local toggling, sign-in toasts, and synchronization with server state.
 */
export function useOptimisticLike(
  post: Pick<Post, "id" | "likedBy" | "likeCount">,
  currentUserId?: string,
) {
  const serverCount = Math.max(post.likeCount ?? 0, 0);
  const serverLiked = currentUserId
    ? (post.likedBy ?? []).includes(currentUserId)
    : false;

  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState<{ liked: boolean; count: number } | null>(
    null,
  );
  const [synced, setSynced] = useState({
    liked: serverLiked,
    count: serverCount,
  });

  if (synced.liked !== serverLiked || synced.count !== serverCount) {
    setSynced({ liked: serverLiked, count: serverCount });
    setLocal(null);
  }

  const liked = local?.liked ?? serverLiked;
  const count = local?.count ?? serverCount;

  const toggle = async () => {
    if (!currentUserId) {
      toast.error("Sign in to like posts");
      return;
    }
    if (pending) return; // rapid double-clicks used to desync the count
    setPending(true);
    const next = !liked;
    setLocal({ liked: next, count: Math.max(0, count + (next ? 1 : -1)) });
    try {
      await togglePostLike(post.id, currentUserId, next);
    } catch (error) {
      console.error("[useOptimisticLike] Like failed:", error);
      setLocal(null); // back to server truth
      toast.error("Couldn’t update your like. Try again.");
    } finally {
      setPending(false);
    }
  };

  return { liked, count, pending, toggle };
}
