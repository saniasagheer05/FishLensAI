import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="scan/index" 
          options={{
            animation: 'fade',
          }} 
        />
        <Stack.Screen 
          name="scan/analyzing" 
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen name="results/[id]" />
        <Stack.Screen name="results/details" />
      </Stack>
    </SafeAreaProvider>
  );
}
