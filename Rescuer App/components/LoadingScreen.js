import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    // Simulate loading delay
    const timeout = setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('RescuerLoginScreen'); // Navigate to the home screen after loading
    }, 2000);

    // Clean up timeout
    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <ImageBackground source={require('./redalertbg.png')} // Background image source
      style= {{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,}}>

    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', }}>
      <Image
        source={require('./Redalert.png')} // Path to your startup logo image
        style={{ width: 120, height: 170, resizeMode: 'contain' }} // Adjust the width and height as needed
      />
      <ActivityIndicator size="large" color="#808080" />
    </View>
    </ImageBackground>
  );
}
