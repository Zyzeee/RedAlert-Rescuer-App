import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground, Image, BackHandler } from 'react-native';
import RescuerLoginScreen from './components/RescuerLoginScreen';
import LoadingScreen from './components/LoadingScreen';
import RescuerInterface from './components/RescuerInterface';
import { AppProvider } from './AppContext';

export default function App() {
  return (
    <NavigationContainer>
      <AppProvider>
        <MainNavigator />
      </AppProvider>
    </NavigationContainer>
  );
}

const Stack = createNativeStackNavigator();

function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Loading Screen */}
      <Stack.Screen name="Loading" component={LoadingScreen} />
      {/* Owner Screens */}
      <Stack.Screen name="RescuerLoginScreen" component={RescuerLoginScreen} />
      <Stack.Screen name="RescuerInterface" component={RescuerInterface} />
    </Stack.Navigator>
  );
}
