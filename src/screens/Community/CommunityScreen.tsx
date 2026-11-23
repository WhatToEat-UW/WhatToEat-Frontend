import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { DiningHallTag, Post } from './types';
import { TagFilter } from './components/TagFilter';
import { SearchBar } from './components/SearchBar';
import { PostCard } from './components/PostCard';
import { NewPostScreen } from './components/NewPostScreen';
import { GuestLockScreen } from './components/GuestLockScreen';
import { styles } from './styles/CommunityScreen.styles';
import { createCommunityPost, displayHallToApi, listCommunityPosts } from '../../services/communityService';

const PAGE_SIZE = 20;

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();

  const [selectedTag, setSelectedTag] = useState<DiningHallTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const posting = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Search + tag run on the server, so they cover every post, not just the first page.
  const fetchPage = useCallback(
    (p: number) =>
      listCommunityPosts({
        page: p,
        limit: PAGE_SIZE,
        q: debouncedQuery || undefined,
        hallTag: selectedTag ? displayHallToApi(selectedTag) : undefined,
      }),
    [debouncedQuery, selectedTag],
  );

  const loadFirst = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await fetchPage(1);
      setPosts(r.posts);
      setHasMore(r.hasMore);
      setPage(1);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const r = await fetchPage(page + 1);
      setPosts(prev => [...prev, ...r.posts.filter(p => !prev.some(x => x.id === p.id))]);
      setHasMore(r.hasMore);
      setPage(page + 1);
    } catch (e: unknown) {
      Alert.alert('Could not load more posts', e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  };

  // Reload on focus and whenever the search / tag filter changes.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFirst();
    }, [loadFirst]),
  );

  if (isGuest) {
    return <GuestLockScreen />;
  }

  const handleNewPost = async (content: string, tag: DiningHallTag) => {
    if (posting.current) return; // double tap used to create the post twice
    posting.current = true;
    try {
      await createCommunityPost({
        content: content.trim(),
        hallTag: displayHallToApi(tag),
      });
      setShowNewPost(false);
      setRefreshing(true);
      await loadFirst();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not post', msg);
    } finally {
      posting.current = false;
    }
  };

  const updatePost = (updated: Post) =>
    setPosts(prev => prev.map(p => (p.id === updated.id ? { ...updated, replies: p.replies } : p)));
  const removePost = (id: string) => setPosts(prev => prev.filter(p => p.id !== id));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${posts.length}${hasMore ? '+' : ''} posts · UW–Madison`}
        </Text>
      </View>

      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <View style={styles.tagSection}>
        <TagFilter selected={selectedTag} onSelect={setSelectedTag} />
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFirst(); }} />
        }
        onScroll={({ nativeEvent: n }) => {
          if (n.layoutMeasurement.height + n.contentOffset.y >= n.contentSize.height - 300) void loadMore();
        }}
        scrollEventThrottle={250}
      >
        {loading && !refreshing ? (
          <View style={[styles.emptyState, { paddingTop: 40 }]}>
            <ActivityIndicator size="large" color="#FF3347" />
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Couldn't load posts</Text>
            <Text style={styles.emptySubtitle}>{loadError}</Text>
            <TouchableOpacity onPress={() => { setLoading(true); loadFirst(); }} style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700', color: '#1A0A0A' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No posts found</Text>
            <Text style={styles.emptySubtitle}>
              {debouncedQuery || selectedTag ? 'Try a different keyword or tag' : 'Be the first to post!'}
            </Text>
          </View>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onChange={updatePost} onDeleted={removePost} />
            ))}
            {loadingMore && <ActivityIndicator color="#FF3347" style={{ marginVertical: 16 }} />}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => setShowNewPost(true)}
        activeOpacity={0.85}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5v14M5 12h14" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>

      <Modal
        visible={showNewPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewPost(false)}
      >
        <NewPostScreen
          onClose={() => setShowNewPost(false)}
          onSubmit={handleNewPost}
        />
      </Modal>
    </View>
  );
}
