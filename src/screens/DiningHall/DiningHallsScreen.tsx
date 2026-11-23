import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { SortOption, DiningHall } from './types';
import { useQuery } from '@tanstack/react-query';
import { fetchDiningHalls } from '../../services/diningHalls';
import { DiningHallCard } from './components/DiningHallCard';
import { SortDropdown } from './components/SortDropdown';
import { DateTabBar, DateTab } from './components/DateTabBar';
import { styles } from './styles/DiningHallsScreen.styles';
import { toLocalYmd } from '../../utils/dateLocal';

// ─── Date helpers ─────────────────────────────────────────────────────────────
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toLocalYmd(d);
}

function buildDateTabs(_today: string): DateTab[] {
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      key: dateKey(i),
      dayLabel: i === 0 ? 'Today' : DAY_LABELS[d.getDay()],
      dateNum: d.getDate(),
      month: MONTH_LABELS[d.getMonth()],
    };
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DiningHallsScreen() {
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortOption>('Relevance');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  // Tabs used to be built once at app start, so they were a day off after midnight.
  const today = toLocalYmd();
  const dateTabs = useMemo(() => buildDateTabs(today), [today]);
  const [pickedDate, setSelectedDate] = useState(today);
  const selectedDate = pickedDate < today ? today : pickedDate;

  const { data, isLoading, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['diningHalls', selectedDate],
    queryFn: () => fetchDiningHalls(selectedDate),
  });

  // Only the selected day's data. A missing day used to borrow another day's menu.
  const halls = (data?.diningHalls ?? []).filter((h: DiningHall) => h.days[selectedDate]);

  const sortedHalls =
    sortBy === 'Open Now'
      ? [...halls].sort((a, b) => {
          const rank = (s: string) => (s === 'open' ? 0 : s === 'soon' ? 1 : 2);
          return rank(a.days[selectedDate].status) - rank(b.days[selectedDate].status);
        })
      : halls;

  const updated = dataUpdatedAt
    ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Dining Halls</Text>
        <Text style={styles.screenSubtitle}>{halls.length} locations on campus{updated}</Text>
      </View>

      {/* Date picker */}
      <DateTabBar
        tabs={dateTabs}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      {/* Sort trigger */}
      <View style={styles.sortRow}>
        <TouchableOpacity
          style={styles.sortTrigger}
          onPress={() => setDropdownVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.sortLabel}>Sorted by:</Text>
          <Text style={styles.sortValue}>{sortBy}</Text>
          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Path d="M2 4l4 4 4-4" stroke={C.inkMuted} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      <SortDropdown
        visible={dropdownVisible}
        current={sortBy}
        onSelect={setSortBy}
        onClose={() => setDropdownVisible(false)}
      />

      {/* Loading / error states */}
      {isLoading && (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.inkMuted} />
      )}
      {isError && (
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ textAlign: 'center', marginTop: 40, color: 'red' }}>
            Failed to load dining halls. Tap to retry.
          </Text>
        </TouchableOpacity>
      )}
      {!isLoading && !isError && halls.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 40, color: C.inkMuted }}>
          No menus posted for this day yet.
        </Text>
      )}

      {/* Hall list */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedHalls.map(hall => (
          <DiningHallCard key={hall.id} hall={hall} day={hall.days[selectedDate]} />
        ))}
      </ScrollView>
    </View>
  );
}