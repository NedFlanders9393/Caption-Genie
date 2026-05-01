import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#E8B669";
const BG = "#FFFDF9";
const FOREGROUND = "#3A3129";
const MUTED = "#8C7A6B";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#F0E3D3";

type UserMeta = {
  username?: string;
  location?: string;
  age?: string;
};

export default function EditProfileScreen() {
  const { user } = useUser();
  const router = useRouter();

  const meta = (user?.unsafeMetadata ?? {}) as UserMeta;

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [username, setUsername] = useState(meta.username ?? "");
  const [location, setLocation] = useState(meta.location ?? "");
  const [age, setAge] = useState(meta.age ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to set a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploadingImage(true);
      try {
        const asset = result.assets[0];

        // Moderation check before uploading (fail open — never block upload on network error)
        if (asset.base64) {
          try {
            const modMimeType = asset.mimeType ?? "image/jpeg";
            const moderationRes = await fetch(
              `${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/moderate-image`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: asset.base64, mimeType: modMimeType }),
              }
            );
            if (moderationRes.ok) {
              const { safe, reason } = await moderationRes.json();
              if (!safe) {
                Alert.alert(
                  "Photo not allowed",
                  reason ?? "This photo contains inappropriate content and cannot be used as a profile picture."
                );
                setIsUploadingImage(false);
                return;
              }
            }
          } catch {
            // Moderation service unreachable — proceed with upload anyway
          }
        }

        const mimeType = asset.mimeType ?? "image/jpeg";
        let blob: Blob;
        if (asset.base64) {
          const byteCharacters = atob(asset.base64);
          const byteArray = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
          }
          blob = new Blob([byteArray], { type: mimeType });
        } else {
          const response = await fetch(asset.uri);
          blob = await response.blob();
        }
        await user?.setProfileImage({ file: blob });
      } catch (err: any) {
        Alert.alert(
          "Upload failed",
          err?.message ?? "Could not upload profile picture. Please try again."
        );
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await user?.update({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        unsafeMetadata: {
          ...meta,
          username: username.trim(),
          location: location.trim(),
          age: age.trim(),
        },
      });
      router.back();
    } catch (err: any) {
      Alert.alert(
        "Save failed",
        err?.message ?? "Could not save profile changes. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const imageUrl = user?.imageUrl;
  const initials = firstName
    ? `${firstName[0]}${lastName ? lastName[0] : ""}`.toUpperCase()
    : user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() ?? "?";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo */}
          <View style={styles.photoSection}>
            <Pressable
              style={styles.avatarWrapper}
              onPress={handlePickImage}
              disabled={isUploadingImage}
            >
              {user?.hasImage && imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="camera" size={15} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
            <Text style={styles.changePhotoText}>
              {isUploadingImage ? "Uploading…" : "Tap to change photo"}
            </Text>
          </View>

          {/* Name */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Name</Text>
            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={MUTED}
                autoCorrect={false}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={MUTED}
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Identity */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(t) =>
                  setUsername(t.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())
                }
                placeholder="username"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City, State"
                placeholderTextColor={MUTED}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ""))}
                placeholder="—"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

          {/* Save */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              isSaving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  photoSection: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FOREGROUND,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BG,
  },
  changePhotoText: {
    fontSize: 13,
    color: MUTED,
    fontFamily: "Inter_400Regular",
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: MUTED,
    fontFamily: "Inter_400Regular",
  },
  input: {
    fontSize: 15,
    color: FOREGROUND,
    fontFamily: "Inter_400Regular",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  divider: {
    height: 1,
    backgroundColor: CARD_BORDER,
    marginVertical: 2,
  },
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonPressed: {
    opacity: 0.88,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
});
