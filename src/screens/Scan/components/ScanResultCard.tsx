import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/ScanResultCard.styles';

type Props = {
  /** detected foods; ✕ drops a wrong guess before saving (totals are recomputed by the parent) */
  items: { name: string; calories: number }[];
  onRemoveItem: (index: number) => void;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  onDismiss: () => void;
  /** When set, shows a second control to POST /scan/log */
  onLogMeal?: () => void;
  logBusy?: boolean;
};

// Shows the nutrition result card after a successful scan
export default function ScanResultCard({
  items,
  onRemoveItem,
  kcal,
  protein,
  carbs,
  fat,
  onDismiss,
  onLogMeal,
  logBusy,
}: Props) {
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultKcal}>{kcal} kcal</Text>
      <View style={styles.macroRow}>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{protein}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{carbs}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{fat}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
      </View>
      {items.map((it, i) => (
        <View key={`${it.name}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ color: 'white', flex: 1, fontWeight: '700' }} numberOfLines={1}>{it.name}</Text>
          <Text style={{ color: 'white', opacity: 0.85, marginRight: 10 }}>{Math.round(it.calories)} kcal</Text>
          <TouchableOpacity onPress={() => onRemoveItem(i)} hitSlop={8} accessibilityLabel={`Remove ${it.name}`}>
            <Text style={{ color: 'white', fontWeight: '900' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.resultNote}>Nutrition information is an estimate</Text>
      {onLogMeal && items.length > 0 ? (
        <TouchableOpacity
          style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }}
          onPress={onLogMeal}
          disabled={logBusy}
          activeOpacity={0.85}
        >
          <Text style={{ color: 'white', fontWeight: '800' }}>{logBusy ? 'Saving…' : 'Save to food log'}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={{ marginTop: 8, paddingVertical: 8 }} onPress={onDismiss} activeOpacity={0.85}>
        <Text style={{ color: 'white', textAlign: 'center', opacity: 0.85 }}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}