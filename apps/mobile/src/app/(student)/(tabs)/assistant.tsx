import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function AssistantScreen() {
  const [question, setQuestion] = useState('');
  return (
    <Screen contentStyle={styles.content}>
      <Text style={styles.title}>Campus assistant</Text>
      <View style={styles.message}>
        <Text style={styles.messageText}>
          Ask about events, clubs, campus services, or college notices. Answers will be grounded in
          approved campus content when the retrieval service is connected.
        </Text>
      </View>
      <View style={styles.composer}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask UniSphere…"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          multiline
        />
        <PrimaryButton
          label="AI service coming in Phase 4"
          disabled
          onPress={() => undefined}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  message: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
  },
  messageText: { color: colors.ink, lineHeight: 24 },
  composer: { gap: spacing.md, marginTop: 'auto' },
  input: {
    minHeight: 100,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    textAlignVertical: 'top',
  },
});
