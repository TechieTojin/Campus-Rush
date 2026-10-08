import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Icon package for input toggles

import { API_URL } from '../config/api';
const BASE_URL = API_URL;

export default function LoginScreen() {
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [emailVerify, setEmailVerify] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordVerify, setPasswordVerify] = useState(false);
  const [invalidUser, setInvalidUser] = useState(false);
  const [incorrectPassword, setIncorrectPassword] = useState(false);

  const handleEmail = (e) => {
    const value = e;
    setEmail(value);
    setEmailVerify(false);
    const regex = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/;
    if (regex.test(value)) {
      setEmailVerify(true);
    }
  };

  const handlePassword = (e) => {
    const value = e;
    setPassword(value);
    setPasswordVerify(false);
    if (value.length > 0) {
      setPasswordVerify(true);
    }
  };

  const handleLogin = async () => {
    if (!emailVerify || !passwordVerify) {
      alert("Enter valid credentials");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/users/login`, {
        email,
        password,
      });

      if (response.data.status === "ok") {
        await AsyncStorage.setItem("token", response.data.data);
        await AsyncStorage.setItem('isLoggedIn', 'true');
        navigation.navigate("Tab");
      } else if (response.data === "Incorrect password") {
        setIncorrectPassword(true);
        setPassword("");
      } else if (response.data === "No user found") {
        setInvalidUser(true);
        setEmail("");
      } else {
        throw new Error('Unknown response');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert("An error occurred. Please try again later.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image source={require('../assets/back.png')} style={styles.backgroundImage} />
      <View style={styles.formContainer}>
        {/* Title: "Campus Rush" */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoTitle}>Campus Rush</Text>
          <Text style={styles.logoText}>Welcome You Back</Text>
        </View>

        {/* Email Input */}
        <View style={[styles.inputContainer, !invalidUser ? styles.validInput : styles.invalidInput]}>
          <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            placeholder="Email or phone"
            keyboardType="email-address"
            onChangeText={handleEmail}
            style={styles.input}
          />
        </View>
        {invalidUser && (
          <Text style={styles.errorMessage}>User not found, please register instead.</Text>
        )}

        {/* Password Input */}
        <View style={[styles.inputContainer, !incorrectPassword ? styles.validInput : styles.invalidInput]}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            placeholder="Password"
            secureTextEntry={!showPassword}
            onChangeText={handlePassword}
            style={styles.input}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordIcon}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
          </Pressable>
        </View>
        {incorrectPassword && (
          <Text style={styles.errorMessage}>Incorrect password</Text>
        )}

        {/* Forgot Password and Login Button */}
        <View style={styles.actionsContainer}>
          <View style={styles.registerContainer}>
            <Text style={styles.text}>Not a member yet?</Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}> Register</Text>
            </Pressable>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Text */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>App developed by <Text style={styles.footerBoldText}>TOJIN and Jaiby</Text></Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    width: wp('80%'),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    height: 50,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  showPasswordIcon: {
    position: 'absolute',
    right: 10,
    top: 15,
  },
  validInput: {
    borderColor: '#28a745',
  },
  invalidInput: {
    borderColor: '#e74c3c',
  },
  errorMessage: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: -10,
    marginBottom: 20,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 30,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerText: {
    color: '#28a745',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  loginButton: {
    backgroundColor: '#28a745',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#333',
  },
  footerBoldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  text: {
    fontSize: 14,
    color: '#333',
  },
});
