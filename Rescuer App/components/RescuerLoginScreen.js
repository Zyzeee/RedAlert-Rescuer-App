import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground, Image, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { app } from '../firebase';
import AppContext from '../AppContext';

export default function RescuerLoginScreen() {
  const navigation = useNavigation();
  const { setRescuerUserId } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);

  // Function to toggle password visibility
  const togglePasswordVisibility = () => {
    setHidePassword(!hidePassword);
  };

  useEffect(() => {
    // Handle back button press
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Return true to prevent default behavior (i.e., back navigation) only if on HomeScreen
        if (navigation.isFocused()) {
          return true;
        }
      }
    );

    return () => backHandler.remove(); // Cleanup event listener on unmount
  }, [navigation]);

  // Function to handle user login
  const handleLogin = async () => {
    // Validation checks
    if (email === '' || password === '') {
      Alert.alert('Warning', 'Please fill in all fields');
      return;
    }

    if (!email.toLowerCase().endsWith('@cvsu.edu.ph')) {
      Alert.alert('Failed to Login!', 'Please enter a Community address');
      return;
    }
  

    try {
      app;
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);

      setRescuerUserId(auth.currentUser.uid);
      // If login successful, navigate to RescuerInterface
      navigation.navigate('RescuerInterface');

      // Clear email and password fields after successful login
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Failed to Login!', 'Incorrect email or password');
    }
  };

  // Function to handle forgot password
  const handleForgotPassword = () => {
    const auth = getAuth();
    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert('Password Reset Email Sent', 'Please check your email to reset your password');
      })
      .catch((error) => {
        console.error('Error sending password reset email:', error);
        Alert.alert('Fill in Email field', 'Please try again');
      });
  };

  return (
    <ImageBackground source={require('./redalertbg.png')} style={styles.backgroundImage}>
      <View style={styles.container}>
        <View>
          <Image source={require('./Redalert.png')} style={styles.image} />
        </View>
        <Text style={styles.title}>Rescuer Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={'#808080'}
          value={email}
          onChangeText={text => setEmail(text)}
        />
        <View style={styles.passwordContainer}>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={'#808080'}
              value={password}
              onChangeText={text => setPassword(text)}
              secureTextEntry={hidePassword}
            />
            <TouchableWithoutFeedback onPress={togglePasswordVisibility}>
              <Text style={styles.togglePassword}>{hidePassword ? 'Show' : 'Hide'}</Text>
            </TouchableWithoutFeedback>
          </View>
        </View>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>LOGIN</Text>
        </TouchableOpacity>
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Having trouble with your password? </Text>
        </View>
        <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.resetText}>Reset your password</Text>
          </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  image: {
    width: 120,
    height: 170,
    marginBottom: 30,
    top: 5
  },
  title: {
    fontSize: 35,
    color: 'black',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold'
    
  },
  input: {
    color: 'black',
    width: '100%',
    padding: 7,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#C70039',
    fontWeight: 'bold',
    borderRadius: 15,
    fontSize: 20,
    backgroundColor: 'white', // Set input background color
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 8,
  },
  passwordInputContainer: {
    position: 'relative',
    borderWidth: 3,
    borderColor: '#C70039',
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white', // Set input background color
  },
  passwordInput: {
    color: 'black',
    padding: 7,
    fontWeight: 'bold',
    flex: 1,
    fontSize: 20,
  },
  togglePassword: {
    color: '#808080',
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -8 }],
    fontSize: 16,
  },
  forgotPasswordContainer: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#C70039',
    fontWeight: 'bold',
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: '#D14F1F',
    width: 90,
    paddingVertical: 10,
    borderRadius: 15,
    marginTop: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  loginText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    left: 13,
    paddingBottom: 15,
    top: 45,
  },
  resetText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F3D9D',
    textDecorationLine: 'underline',
    marginLeft: 18,
    top: 46,
  },
});
