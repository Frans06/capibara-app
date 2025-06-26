import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "@tanstack/react-form";

import { signupValidator } from "@capibara/validators";

import { Button } from "~/components/elements/ui/button";
import { Input } from "~/components/elements/ui/input";
import { authClient } from "~/utils/auth";

export default function SignUp() {
  const router = useRouter();
  const form = useForm({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    validators: { onChange: signupValidator() },
    onSubmit: async ({ value }) => {
      const res = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      });
    },
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="mb-2 text-center text-3xl font-bold text-foreground">
              Sign Up
            </Text>
            <Text className="text-center text-base text-gray-600">
              Create an account to get started
            </Text>
          </View>

          {/* Form */}
          <View className="flex flex-col gap-8 space-y-4">
            {/* Name Input */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Name
              </Text>
              <form.Field name="name">
                {(field) => (
                  <>
                    <Input
                      placeholder="Enter your name"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                    />
                    {!field.state.meta.isValid && (
                      <Text className="mt-1 text-xs text-red-500">
                        {field.state.meta.errors
                          .map((e) => e?.message)
                          .join(", ")}
                      </Text>
                    )}
                  </>
                )}
              </form.Field>
            </View>

            {/* Email Input */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Email
              </Text>
              <form.Field name="email">
                {(field) => (
                  <>
                    <Input
                      placeholder="Enter your email"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!field.state.meta.isValid && (
                      <Text className="mt-1 text-xs text-red-500">
                        {field.state.meta.errors
                          .map((e) => e?.message)
                          .join(", ")}
                      </Text>
                    )}
                  </>
                )}
              </form.Field>
            </View>

            {/* Password Input */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Password
              </Text>
              <form.Field name="password">
                {(field) => (
                  <>
                    <Input
                      placeholder="Enter your password"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!field.state.meta.isValid && (
                      <Text className="mt-1 text-xs text-red-500">
                        {field.state.meta.errors
                          .map((e) => e?.message)
                          .join(", ")}
                      </Text>
                    )}
                  </>
                )}
              </form.Field>
            </View>

            {/* Confirm Password Input */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Confirm Password
              </Text>
              <form.Field name="confirmPassword">
                {(field) => (
                  <>
                    <Input
                      placeholder="Confirm your password"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!field.state.meta.isValid && (
                      <Text className="mt-1 text-xs text-red-500">
                        {field.state.meta.errors
                          .map((e) => e?.message)
                          .join(", ")}
                      </Text>
                    )}
                  </>
                )}
              </form.Field>
            </View>

            {/* Auth Button */}
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  onPress={form.handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  size={"lg"}
                  variant={"secondary"}
                >
                  <Text>{isSubmitting ? "Loading..." : "Sign Up"}</Text>
                </Button>
              )}
            />

            {/* Toggle Auth Mode */}
            <View className="mt-6 flex-row items-center justify-center">
              <Text className="text-base text-gray-600">
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => router.replace("/login")}>
                <Text className="text-base font-semibold text-accent">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View className="mt-8">
            <Text className="text-center text-sm text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
