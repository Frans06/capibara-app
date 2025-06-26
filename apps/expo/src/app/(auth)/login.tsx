import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "expo-router";
import { useForm } from "@tanstack/react-form";

import { loginValidator } from "@capibara/validators";

import { Input } from "~/components/elements/ui/input";
import { authClient } from "~/utils/auth";

export default function Login() {
  const navigation = useNavigation();
  const { data: session } = authClient.useSession();
  const form = useForm({
    defaultState: { email: "", password: "" },
    validators: { onChange: loginValidator() },
    onSubmit: async ({ value }) => {
      const res = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
      console.log(res);
    },
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="mb-2 text-center text-3xl font-bold text-gray-900">
              Create Account
            </Text>
            <Text className="text-center text-base text-gray-600">
              Sign up to get started
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
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
                      <Text>
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
                      value={field.state.password}
                      onChangeText={field.handleChange}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {!field.state.meta.isValid && (
                      <Text>{field.state.meta.errors.join(", ")}</Text>
                    )}
                  </>
                )}
              </form.Field>
            </View>

            {/* Auth Button */}
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <TouchableOpacity
                  className={`mt-6 rounded-lg py-4 ${
                    isSubmitting ? "bg-blue-400" : "bg-blue-600"
                  }`}
                  onPress={form.handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                >
                  <Text className="text-center text-base font-semibold text-white">
                    {isSubmitting ? "Loading..." : "Sign In"}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Toggle Auth Mode */}
            <View className="mt-6 flex-row items-center justify-center">
              <Text className="text-base text-gray-600">
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => navigation.push("/signup")}>
                <Text className="text-base font-semibold text-blue-600">
                  Sign Up
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
