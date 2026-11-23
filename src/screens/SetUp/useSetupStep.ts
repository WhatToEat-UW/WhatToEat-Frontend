import { useState } from 'react';
import { Alert } from 'react-native';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { useOnboardingDraft, type OnboardingDraft } from '../../stores/onboardingDraftStore';
import { updatePreferences } from '../../services/questionnaireService';

type Answer = Partial<
  Pick<OnboardingDraft, 'birthday' | 'gender' | 'dietType' | 'dislikes' | 'allergens' | 'favoriteDiningHalls'>
>;

/**
 * Continue handler for a SetUp screen.
 * - Onboarding: store the answer in the draft and go to `nextScreen`.
 * - Edit mode (opened from Edit Profile with `{ edit: true }`): save just this answer
 *   with PATCH /users/me/preferences and go back, instead of walking the whole flow.
 */
export function useSetupStep(nextScreen: string) {
  const navigation = useNavigation();
  const edit = !!(useRoute().params as { edit?: boolean } | undefined)?.edit;
  const setDraft = useOnboardingDraft((s) => s.setDraft);
  const [saving, setSaving] = useState(false);

  const next = async (answer: Answer) => {
    if (!edit) {
      setDraft(answer);
      navigation.dispatch(CommonActions.navigate({ name: nextScreen }));
      return;
    }
    setSaving(true);
    try {
      await updatePreferences({
        birthday: answer.birthday ?? undefined,
        gender: answer.gender ?? undefined,
        diet_type: answer.dietType ?? undefined,
        dislikes: answer.dislikes,
        allergens: answer.allergens,
        favorite_dining_halls: answer.favoriteDiningHalls,
      });
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return { edit, next, saving };
}
