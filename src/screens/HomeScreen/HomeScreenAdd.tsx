import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { getAddons, logMeal } from '../../services/homescreenService';
import { AddonItem } from '../../types/homescreen';

const COLORS = {
  ink: '#1A0A0A',
  inkMuted: '#A06030',
  border: '#2A1A0A',
  bg: '#FFF4DC',
};

export default function HomeScreenAdd() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [suggestions, setSuggestions] = React.useState<AddonItem[]>([]);
  const [quickAddons, setQuickAddons] = React.useState<AddonItem[]>([]);
  const { mealType } = useRoute<RouteProp<RootStackParamList, 'Add'>>().params;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // food ids already logged (or in flight) on this screen — a second tap used to log it again
  const [added, setAdded] = React.useState<Set<number>>(new Set());
  const pending = React.useRef(new Set<number>());

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    getAddons(mealType)
      .then(data => {
        setSuggestions(data?.suggestions ?? []);
        setQuickAddons(data?.quickAddons ?? []);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [mealType]);
  React.useEffect(load, [load]);

  const handleAddItem = async (item: AddonItem) => {
    if (added.has(item.id) || pending.current.has(item.id)) return;
    pending.current.add(item.id);
    try {
      await logMeal(mealType, [{
        foodId: item.id,
        foodName: item.name,
        quantity: 1,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        source: 'menu',
      }]);
      setAdded(prev => new Set(prev).add(item.id));
    } catch (err) {
      Alert.alert(`Could not add ${item.name}`, err instanceof Error ? err.message : String(err));
    } finally {
      pending.current.delete(item.id);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Eat anything{'\n'}else at {mealType}?</Text>
            <Text style={styles.pageSub}>Tap to add it to your {mealType} totals</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.8}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M18 6L6 18M6 6l12 12"
                stroke={COLORS.ink}
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.inkMuted} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.optionKcal}>Couldn't load add-ons. {error}</Text>
            <TouchableOpacity style={styles.snackChip} onPress={load}>
              <Text style={styles.snackChipName}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Suggestions grid */}
            <View style={styles.optionsGrid}>
              {suggestions.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.optionCard, added.has(item.id) && styles.addedCard]}
                  activeOpacity={0.85}
                  onPress={() => handleAddItem(item)}
                  disabled={added.has(item.id)}
                >
                  <Text style={styles.optionEmoji}>{added.has(item.id) ? '✅' : '🍽️'}</Text>
                  <Text style={styles.optionName}>{item.name}</Text>
                  {item.calories != null && (
                    <Text style={styles.optionKcal}>{item.calories} kcal</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick add-ons */}
            <Text style={styles.sectionLabel}>Quick Add-ons</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.snacksRow}
            >
              {quickAddons.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.snackChip, added.has(item.id) && styles.addedCard]}
                  activeOpacity={0.85}
                  onPress={() => handleAddItem(item)}
                  disabled={added.has(item.id)}
                >
                  <Text style={styles.snackEmoji}>{added.has(item.id) ? '✅' : '➕'}</Text>
                  <Text style={styles.snackChipName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFD166' },
  container: { flex: 1, backgroundColor: COLORS.bg },
  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16,
    backgroundColor: COLORS.bg,
  },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#E8400A', letterSpacing: -0.7, lineHeight: 30, marginBottom: 4 },
  pageSub: { fontSize: 12, fontWeight: '500', color: COLORS.inkMuted },
  closeBtn: {
    width: 36, height: 36, borderRadius: 12, marginTop: 2, flexShrink: 0,
    backgroundColor: 'rgba(255, 200, 80, 0.5)', borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.border, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
  },
  scrollBody: { flex: 1 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  optionCard: {
    width: '47.5%', borderWidth: 2.5, borderColor: COLORS.border,
    borderRadius: 18, paddingTop: 20, paddingBottom: 18, paddingHorizontal: 12,
    alignItems: 'center', gap: 6, backgroundColor: '#FFF9F0',
    shadowColor: COLORS.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  optionEmoji: { fontSize: 26 },
  optionName: { fontSize: 13, fontWeight: '900', color: COLORS.ink, letterSpacing: -0.2, lineHeight: 18, textAlign: 'center' },
  optionKcal: { fontSize: 11, fontWeight: '600', color: COLORS.inkMuted },
  sectionLabel: {
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 10,
    fontSize: 11, fontWeight: '900', color: COLORS.inkMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  snacksRow: { paddingLeft: 16, paddingRight: 16, flexDirection: 'row', alignItems: 'center' },
  snackChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 2, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10,
    shadowColor: COLORS.border, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  snackEmoji: { fontSize: 16 },
  addedCard: { opacity: 0.55 },
  errorBox: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 30, gap: 12 },
  snackChipName: { fontSize: 12, fontWeight: '800', color: COLORS.ink, lineHeight: 16 },
});