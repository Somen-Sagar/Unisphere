import { useMutation } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing } from '@/theme/tokens';

function tokenFromQr(data: string): string | null {
  const prefix = 'unisphere://registration/';
  if (data.startsWith(prefix)) return data.slice(prefix.length);
  return data.trim() || null;
}

export default function ScannerScreen() {
  const { api } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [paused, setPaused] = useState(false);
  const scan = useMutation({
    mutationFn: (qrToken: string) => api.scanAttendance(qrToken),
    onSuccess: async (registration) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Check-in confirmed', registration.event.title, [
        { text: 'Scan next', onPress: () => setPaused(false) },
      ]);
    },
    onError: async (error) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Pass rejected', error instanceof Error ? error.message : 'Invalid pass.', [
        { text: 'Try again', onPress: () => setPaused(false) },
      ]);
    },
  });

  if (!permission) return <Screen scroll={false} />;
  if (!permission.granted) {
    return (
      <Screen contentStyle={styles.permission}>
        <Text style={styles.permissionTitle}>Camera access is required</Text>
        <Text style={styles.permissionBody}>
          UniSphere only uses the camera while this scanner is open.
        </Text>
        <PrimaryButton label="Allow camera" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          paused
            ? undefined
            : ({ data }) => {
                const qrToken = tokenFromQr(data);
                if (!qrToken) return;
                setPaused(true);
                scan.mutate(qrToken);
              }
        }
      />
      <View style={styles.overlay}>
        <Text style={styles.instruction}>
          {scan.isPending ? 'Verifying pass…' : 'Place a UniSphere QR inside the frame'}
        </Text>
        <View style={styles.frame} />
        {paused && !scan.isPending ? (
          <Pressable style={styles.resume} onPress={() => setPaused(false)}>
            <Text style={styles.resumeText}>Resume scanning</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permission: { justifyContent: 'center', gap: spacing.lg },
  permissionTitle: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  permissionBody: { color: colors.inkMuted, lineHeight: 22 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  instruction: {
    maxWidth: 280,
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: radius.lg,
  },
  resume: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  resumeText: { color: colors.ink, fontWeight: '700' },
});
