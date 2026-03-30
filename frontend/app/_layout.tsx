import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import websocketService from '../services/websocket';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { user, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    // Connect WebSocket when user is authenticated
    if (isAuthenticated && user) {
      websocketService.connect(user.user_id);
    }
    
    return () => {
      // Disconnect on unmount
      websocketService.disconnect();
    };
  }, [isAuthenticated, user]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
