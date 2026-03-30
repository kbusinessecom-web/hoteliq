import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import websocketService from '../services/websocket';
import notificationService from '../services/notifications';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { user, isAuthenticated } = useAuthStore();
  
  // Initialize notification service on app start
  useEffect(() => {
    notificationService.initialize();
    
    return () => {
      notificationService.cleanup();
    };
  }, []);
  
  // Connect services when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect WebSocket
      websocketService.connect(user.user_id);
      
      // Register push token after login
      notificationService.registerPushToken();
    }
    
    return () => {
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
