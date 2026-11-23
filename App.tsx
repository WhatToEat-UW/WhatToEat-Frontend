import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { COLORS } from './src/constants/COLORS';
import LoginScreen from './src/screens/Auth/LoginScreen';
import SignupScreen from './src/screens/Auth/SignupScreen';
import ForgotPasswordScreen from './src/screens/Auth/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/Auth/ResetPasswordScreen';
import AllergensScreen from './src/screens/SetUp/AllergensScreen';
import BirthdayScreen from './src/screens/SetUp/BirthdayScreen';
import DietScreen from './src/screens/SetUp/DietScreen';
import DiningHallScreen from './src/screens/SetUp/DiningHallScreen';
import DislikesScreen from './src/screens/SetUp/DislikesScreen';
import GenderScreen from './src/screens/SetUp/GenderScreen';
import GoalWeightScreen from './src/screens/SetUp/GoalWeightScreen';
import HeightScreen from './src/screens/SetUp/HeightScreen';
import PrivacyPolicyScreen from './src/screens/SetUp/PrivacyPolicyScreen';
import WeightScreen from './src/screens/SetUp/WeightScreen';
import WelcomeScreen from './src/screens/SetUp/WelcomeScreen';
import BottomBar from './src/navigation/BottomBar';
import HomeScreenMeal from './src/screens/HomeScreen/HomeScreenMeal';
import HomeScreenConfirm from './src/screens/HomeScreen/HomeScreenConfirm';
import HomeScreenAdd from './src/screens/HomeScreen/HomeScreenAdd';
import ScanScreen from './src/screens/Scan/ScanScreen';
import SignupVerifyScreen from './src/screens/Auth/SignupVerifyScreen';
import EditProfileScreen from './src/screens/Profile/EditProfileScreen';
import type { Combo } from './src/types/homescreen';
import type { MealPeriod } from './src/services/homescreenService';

export type RootStackParamList = {
  ForgotPassword: undefined;
  Login: undefined;
  ResetPassword: undefined;
  Signup: undefined;
  Allergens: { edit?: boolean } | undefined;
  Birthday: { edit?: boolean } | undefined;
  Diet: { edit?: boolean } | undefined;
  DiningHall: { edit?: boolean } | undefined;
  Dislikes: { edit?: boolean } | undefined;
  Gender: { edit?: boolean } | undefined;
  GoalWeight: undefined;
  Height: undefined;
  PrivacyPolicy: undefined;
  Weight: undefined;
  Welcome: undefined;
  Home: undefined;
  // combo omitted (Dining Hall AI pick) → Meal fetches the top pick for mealType itself
  Meal: { combo?: Combo; mealType?: MealPeriod } | undefined;
  Confirm: { combo: Combo; mealType: MealPeriod };
  Add: { mealType: MealPeriod };
  Scan: undefined;
  SignupVerify: { email: string };
  EditProfile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

/**
 * Which screens exist depends on auth state; when it changes, React Navigation switches
 * to the first screen of the new set on its own (no navigate('Home') calls in screens).
 *  - reset-password link opened → ResetPassword only
 *  - signed in, setup not done  → SetUp flow (Welcome first)
 *  - signed in / guest          → app (+ SetUp for "retake", + auth screens for guests)
 *  - otherwise                  → Login / Signup
 */
function RootNavigator() {
  const { initializing, session, isGuest, onboarding, recovering } = useAuth();

  if (initializing || (session && !recovering && onboarding === 'unknown')) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  const authScreens = (
    <>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Signup"         component={SignupScreen} />
      <Stack.Screen name="SignupVerify"   component={SignupVerifyScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </>
  );
  const setupScreens = (
    <>
      <Stack.Screen name="Welcome"        component={WelcomeScreen} />
      <Stack.Screen name="Birthday"       component={BirthdayScreen} />
      <Stack.Screen name="Gender"         component={GenderScreen} />
      <Stack.Screen name="Height"         component={HeightScreen} />
      <Stack.Screen name="Weight"         component={WeightScreen} />
      <Stack.Screen name="GoalWeight"     component={GoalWeightScreen} />
      <Stack.Screen name="Diet"           component={DietScreen} />
      <Stack.Screen name="Dislikes"       component={DislikesScreen} />
      <Stack.Screen name="Allergens"      component={AllergensScreen} />
      <Stack.Screen name="DiningHall"     component={DiningHallScreen} />
      <Stack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen} />
    </>
  );
  const appScreens = (
    <>
      <Stack.Screen name="Home"           component={BottomBar} />
      <Stack.Screen name="Meal"           component={HomeScreenMeal} />
      <Stack.Screen name="Confirm"        component={HomeScreenConfirm} />
      <Stack.Screen name="Add"            component={HomeScreenAdd} />
      <Stack.Screen name="Scan"           component={ScanScreen} />
      <Stack.Screen name="EditProfile"    component={EditProfileScreen} />
    </>
  );

  let screens: React.ReactNode;
  let mode: string;
  if (recovering) {
    mode = 'recovery';
    screens = <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />;
  } else if (session && onboarding === 'needed') {
    mode = 'setup';
    screens = setupScreens;
  } else if (session || isGuest) {
    mode = session ? 'app' : 'guest';
    screens = (
      <>
        {appScreens}
        {setupScreens}
        {isGuest && authScreens}
      </>
    );
  } else {
    mode = 'signedOut';
    screens = authScreens;
  }

  return (
    <NavigationContainer>
      {/* key: a new auth mode starts fresh on its first screen. Without it, tapping
          "Continue as guest" stayed on Login, because guests also get the Login screen. */}
      <Stack.Navigator key={mode} screenOptions={{ headerShown: false }}>{screens}</Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}