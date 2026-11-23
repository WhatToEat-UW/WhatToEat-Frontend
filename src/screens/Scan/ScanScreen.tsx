import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { styles } from './styles/ScanScreen.styles';
import ScanFrame from './components/ScanFrame';
import ScanResultCard from './components/ScanResultCard';
import ScanErrorCard from './components/ScanErrorCard';
import ScanControls from './components/ScanControls';
import { logScanResult, uploadFoodScan, type ScanItem } from '../../services/scanService';
import { currentMealType } from '../../services/homescreenService';

type ScanState = 'idle' | 'analyzing' | 'result' | 'error';

const openSettingsAlert = (what: string) =>
  Alert.alert(`${what} access is off`, `Turn on ${what.toLowerCase()} access for WhatToEat in Settings.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => void Linking.openSettings() },
  ]);

export default function ScanScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  // Tabs stay mounted; without this the camera kept running on other tabs.
  const isFocused = useIsFocused();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [logBusy, setLogBusy] = useState(false);

  // Totals follow the item list so removing a wrong item updates them.
  const sum = (k: 'calories' | 'protein' | 'carbs' | 'fat') =>
    Math.round(scanItems.reduce((t, i) => t + (i[k] ?? 0), 0));

  const handleFlip = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const analyzeUri = async (uri: string) => {
    setScanState('analyzing');
    try {
      const data = await uploadFoodScan(uri);
      setScanId(data.scanId);
      setScanItems(data.items ?? []);
      setScanState('result');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Scan failed', msg);
      setScanState('error');
    }
  };

  const runScan = async () => {
    try {
      const cam = cameraRef.current;
      if (cam && typeof (cam as CameraView).takePictureAsync === 'function') {
        const pic = await (cam as CameraView).takePictureAsync({ quality: 0.65, skipProcessing: false });
        if (pic?.uri) {
          await analyzeUri(pic.uri);
          return;
        }
      }
      Alert.alert('Camera', 'Could not capture a photo. Try upload from gallery.');
      setScanState('error');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Camera error', msg);
      setScanState('error');
    }
  };

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      openSettingsAlert('Photo'); // used to return silently
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // MediaTypeOptions is deprecated
      quality: 0.8,
    });

    if (!picked.canceled && picked.assets[0]?.uri) {
      await analyzeUri(picked.assets[0].uri);
    }
  };

  const handleReset = () => {
    setScanState('idle');
    setScanId(null);
    setScanItems([]);
  };

  const handleLogMeal = async () => {
    if (!scanItems.length) {
      Alert.alert('Nothing to log', 'No scan items returned from the server.');
      return;
    }
    setLogBusy(true);
    try {
      await logScanResult({
        scanId: scanId ?? undefined,
        mealType: currentMealType(),
        items: scanItems.map((i) => ({
          name: i.name,
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fat: i.fat,
        })),
      });
      Alert.alert('Saved', 'Meal added to your food log.');
      handleReset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not save log', msg);
    } finally {
      setLogBusy(false);
    }
  };

  if (!permission) return <View style={styles.permissionContainer} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionDesc}>
            WhatToEat needs camera access to scan and analyze your meals.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            // After "Don't ask again" requestPermission does nothing; send the user to Settings.
            onPress={permission.canAskAgain ? requestPermission : () => void Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Text style={styles.permissionBtnText}>
              {permission.canAskAgain ? 'Grant Permission' : 'Open Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isFocused) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <ScanFrame />

        {scanState === 'idle' && (
          <Text style={styles.hintText}>Scan or upload a photo</Text>
        )}

        {scanState === 'analyzing' && (
          <View style={styles.analyzingWrap}>
            <ActivityIndicator color="white" size="small" />
            <Text style={styles.analyzingText}>Analyzing...</Text>
          </View>
        )}

        {scanState === 'result' && (
          <ScanResultCard
            items={scanItems}
            onRemoveItem={(i) => setScanItems((prev) => prev.filter((_, j) => j !== i))}
            kcal={sum('calories')}
            protein={sum('protein')}
            carbs={sum('carbs')}
            fat={sum('fat')}
            onDismiss={handleReset}
            onLogMeal={handleLogMeal}
            logBusy={logBusy}
          />
        )}

        {scanState === 'error' && <ScanErrorCard onRetry={handleReset} />}

        <ScanControls
          isAnalyzing={scanState === 'analyzing'}
          onShutter={runScan}
          onUpload={handleUpload}
          onFlip={handleFlip}
        />
      </CameraView>
    </View>
  );
}
