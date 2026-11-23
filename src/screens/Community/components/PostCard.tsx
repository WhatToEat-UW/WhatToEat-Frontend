import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import {
  likeCommunityPost,
  unlikeCommunityPost,
  likeReply,
  unlikeReply,
} from '../../../services/communityService';
import Svg, { Path } from 'react-native-svg';
import { Post, Reply } from '../types';
import { styles } from '../styles/PostCard.styles';
import { TAG_COLORS } from '../styles/TagColors';
import { PostDetailScreen } from './PostDetailScreen';

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill={filled ? '#FF3347' : 'none'}>
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      stroke={filled ? '#FF3347' : '#9A7070'}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

const CommentIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      stroke="#9A7070"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

type LikeApi = (id: string) => Promise<{ liked: boolean; likeCount: number }>;

/** Like state saved on the server (used to flip only locally and reset on refresh). */
function useServerLike(id: string, initialLiked: boolean, initialCount: number, like: LikeApi, unlike: LikeApi) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const busy = useRef(false);
  useEffect(() => { setLiked(initialLiked); setCount(initialCount); }, [initialLiked, initialCount]);

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    const was = liked;
    setLiked(!was); // optimistic
    setCount(c => c + (was ? -1 : 1));
    try {
      const r = await (was ? unlike : like)(id);
      setLiked(r.liked);
      setCount(r.likeCount);
    } catch (e: unknown) {
      setLiked(was);
      setCount(c => c + (was ? 1 : -1));
      Alert.alert('Could not update like', e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
    }
  };
  return { liked, count, toggle };
}

// One level of reply shown on main feed
const ReplyPreviewRow = ({ reply, isLast }: { reply: Reply; isLast: boolean }) => {
  const { liked, count, toggle } = useServerLike(reply.id, reply.likedByMe, reply.likes, likeReply, unlikeReply);
  return (
    <View style={styles.replyWrap}>
      <View style={styles.threadLineCol}>
        <View style={[styles.threadLine, isLast && styles.threadLineLast]} />
        <View style={styles.threadDot} />
      </View>
      <View style={styles.replyContent}>
        <View style={styles.replyHeader}>
          <View style={styles.replyAvatarWrap}>
            <Text style={styles.replyAvatar}>{reply.avatar}</Text>
          </View>
          <Text style={styles.replyAuthor}>{reply.author}</Text>
          <Text style={styles.replyTime}>{reply.createdAt}</Text>
        </View>
        <Text style={styles.replyText}>{reply.content}</Text>
        <TouchableOpacity
          style={styles.replyLike}
          onPress={toggle}
          activeOpacity={0.7}
        >
          <HeartIcon filled={liked} />
          <Text style={[styles.replyLikeCount, liked && styles.replyLikeCountActive]}>{count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface Props {
  post: Post;
  onChange: (post: Post) => void;
  onDeleted: (postId: string) => void;
}

export const PostCard = ({ post, onChange, onDeleted }: Props) => {
  const { liked, count: likeCount, toggle } = useServerLike(
    post.id, post.likedByMe, post.likes, likeCommunityPost, unlikeCommunityPost,
  );
  const [showDetail, setShowDetail] = useState(false);
  const tagColor = post.hallTag ? TAG_COLORS[post.hallTag] : null;
  const previewReplies = (post.replies ?? []).slice(0, 2); // show max 2 on feed
  const hasReplies = previewReplies.length > 0;

  return (
    <>
      {/* Tap anywhere on card to open detail */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => setShowDetail(true)}
        activeOpacity={0.95}
      >
        <View style={styles.postRow}>
          <View style={styles.avatarCol}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatar}>{post.avatar}</Text>
            </View>
            {hasReplies && <View style={styles.postThreadLine} />}
          </View>

          <View style={styles.postBody}>
            <View style={styles.postHeader}>
              <Text style={styles.authorName}>{post.author}</Text>
              <Text style={styles.createdAt}>{post.createdAt}</Text>
              {tagColor && (
                <View style={[styles.hallTag, { backgroundColor: tagColor.bg }]}>
                  <Text style={[styles.hallTagText, { color: tagColor.text }]}>{post.hallTag}</Text>
                </View>
              )}
            </View>

            <Text style={styles.content}>{post.content}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={e => {
                  e.stopPropagation?.();
                  void toggle();
                }}
                activeOpacity={0.7}
              >
                <HeartIcon filled={liked} />
                <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likeCount}</Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <CommentIcon />
                {/* feed items come without reply trees, so replies.length was always 0 */}
                <Text style={styles.actionText}>{post.comments}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Preview replies (1 level only) */}
        {hasReplies && (
          <View style={styles.repliesSection}>
            {previewReplies.map((reply, i) => (
              <ReplyPreviewRow
                key={reply.id}
                reply={reply}
                isLast={i === previewReplies.length - 1}
              />
            ))}
            {(post.replies?.length ?? 0) > 2 && (
              <Text style={styles.moreReplies}>
                View {(post.replies?.length ?? 0) - 2} more repl{(post.replies?.length ?? 0) - 2 === 1 ? 'y' : 'ies'} →
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Full detail modal */}
      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}
      >
        <PostDetailScreen
          post={{ ...post, likes: likeCount, likedByMe: liked }}
          onClose={(updated) => { setShowDetail(false); onChange(updated); }}
          onDeleted={(id) => { setShowDetail(false); onDeleted(id); }}
        />
      </Modal>
    </>
  );
};