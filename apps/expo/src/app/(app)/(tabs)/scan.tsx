import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function ScanReceipt() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const queryClient = useQueryClient();

  const createUploadUrl = useMutation(
    trpc.receipt.createUploadUrl.mutationOptions(),
  );
  const scanReceipt = useMutation(
    trpc.receipt.scan.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          void queryClient.invalidateQueries(trpc.receipt.list.queryFilter());
          router.push({
            pathname: "/receipts/[id]",
            params: { id: data.receiptId },
          });
        } else {
          Alert.alert(
            "Scan Failed",
            "Could not extract receipt data. Please try again with a clearer photo.",
          );
        }
        setStatusText("");
      },
      onError: () => {
        setStatusText("");
      },
    }),
  );

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Camera permission is required to scan receipts.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadAndScan = async () => {
    if (!imageUri) return;

    try {
      setStatusText("Getting upload URL...");
      const { uploadUrl, receiptId } = await createUploadUrl.mutateAsync({
        contentType: "image/jpeg",
      });

      setStatusText("Uploading image...");
      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setStatusText("Scanning receipt...");
      await scanReceipt.mutateAsync({ receiptId });
    } catch (error) {
      Alert.alert("Error", "Failed to upload and scan receipt.");
      console.error(error);
      setStatusText("");
    }
  };

  const isLoading =
    createUploadUrl.isPending || scanReceipt.isPending || !!statusText;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-4 p-4">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="w-full flex-1 rounded-lg"
            resizeMode="contain"
          />
        ) : (
          <View className="w-full flex-1 items-center justify-center rounded-lg bg-muted">
            <Text className="text-lg text-muted-foreground">
              Take a photo or pick from gallery
            </Text>
          </View>
        )}

        {statusText ? (
          <View className="flex-row items-center justify-center gap-2 py-3">
            <ActivityIndicator />
            <Text className="text-foreground">{statusText}</Text>
          </View>
        ) : null}

        <View className="flex-row gap-2">
          <Pressable
            onPress={takePhoto}
            disabled={isLoading}
            className="flex-1 items-center rounded-lg bg-primary p-4"
          >
            <Text className="font-semibold text-primary-foreground">
              Camera
            </Text>
          </Pressable>
          <Pressable
            onPress={pickImage}
            disabled={isLoading}
            className="flex-1 items-center rounded-lg border border-input bg-background p-4"
          >
            <Text className="font-semibold text-foreground">Gallery</Text>
          </Pressable>
        </View>

        {imageUri && !isLoading ? (
          <Pressable
            onPress={uploadAndScan}
            className="items-center rounded-lg bg-primary p-4"
          >
            <Text className="text-lg font-bold text-primary-foreground">
              Scan Receipt
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
