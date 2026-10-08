import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useState } from 'react';
import { Image, ImageBackground, Pressable, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Icon from "react-native-feather";
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default function RegisterScreen() {
    const navigation = useNavigation();
    const [showPassword, setShowPassword] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [cpassword, setCpassword] = useState('');
    const [nameVerify, setNameVerify] = useState(false);
    const [emailVerify, setEmailVerify] = useState(false);
    const [phoneVerify, setPhoneVerify] = useState(false);
    const [passwordVerify, setPasswordVerify] = useState(false);
    const [cpasswordVerify, setCpasswordVerify] = useState(false);
    const [user, setUser] = useState(false);

    const handleName = (e) => {
        const value = e;
        setName(value);
        setNameVerify(false);
        const regex = /^[a-zA-Z\s]{3,}$/;
        if (regex.test(value)) {
            setNameVerify(true);
        }
    };
    const handleEmail = (e) => {
        const value = e;
        setEmail(value);
        setEmailVerify(false);
        const regex = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/;
        if (regex.test(value)) {
            setEmailVerify(true);
        }
    };
    const handlePhone = (e) => {
        const value = e;
        setPhone(value);
        setPhoneVerify(false);
        const regex = /^[0-9]{10}$/;
        if (regex.test(value)) {
            setPhoneVerify(true);
        }
    };
    const handlePassword = (e) => {
        const value = e;
        setPassword(value);
        setPasswordVerify(false);
        const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
        if (regex.test(value)) {
            setPasswordVerify(true);
        }
    };
    const handleCpassword = (e) => {
        const value = e;
        setCpassword(value);
        setCpasswordVerify(false);
        if (password === value) {
            setCpasswordVerify(true);
        }
    };

    const handleRegister = () => {
        if (!nameVerify || !emailVerify || !passwordVerify || !cpasswordVerify || !phoneVerify) {
            alert("Fill all the mandatory fields correctly");
        } else {
            setUser(false);
            const userData = {
                name: name,
                email,
                phone,
                password,
            };
            axios.post("http://100.127.255.249:5001/users/register", userData).then((res) => {
                if (res.data === "exists") {
                    setUser(true);
                } else {
                    setName('');
                    setEmail('');
                    setPhone('');
                    setPassword('');
                    setCpassword('');
                    navigation.navigate('Login');
                }
            }).catch((e) => console.log(`Error: ${e}`));
        }
    };

    return (
        <ImageBackground
            source={require('../assets/back.png')}  // Set the background image path here
            style={{ flex: 1 }}   // Ensure it takes up the entire screen
        >
            <SafeAreaView style={{ flex: 1, padding: 20 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View className="flex items-center mb-6">
                        <Image
                            source={require('../assets/logIn.png')}
                            style={{
                                width: wp('70%'),
                                height: wp('40%'),
                                resizeMode: 'contain',
                                marginBottom: 20,
                            }}
                        />
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        {/* Name Input */}
                        <View style={{ borderColor: nameVerify ? 'green' : 'gray', borderWidth: 1, borderRadius: 8, marginBottom: 10 }}>
                            <TextInput
                                placeholder="Name"
                                onChangeText={handleName}
                                value={name}
                                style={{ padding: 10, fontSize: 16, color: 'black' }}
                            />
                            {name.length < 1 ? null : nameVerify ? (
                                <Icon.CheckCircle stroke="#4CAF50" />
                            ) : (
                                <Icon.AlertCircle stroke="#F44336" />
                            )}
                        </View>

                        {/* Email Input */}
                        <View style={{ borderColor: emailVerify ? 'green' : 'gray', borderWidth: 1, borderRadius: 8, marginBottom: 10 }}>
                            <TextInput
                                placeholder="Email"
                                keyboardType="email-address"
                                onChangeText={handleEmail}
                                value={email}
                                style={{ padding: 10, fontSize: 16, color: 'black' }}
                            />
                            {email.length < 1 ? null : emailVerify ? (
                                <Icon.CheckCircle stroke="#4CAF50" />
                            ) : (
                                <Icon.AlertCircle stroke="#F44336" />
                            )}
                        </View>

                        {/* Phone Input */}
                        <View style={{ borderColor: phoneVerify ? 'green' : 'gray', borderWidth: 1, borderRadius: 8, marginBottom: 10 }}>
                            <TextInput
                                placeholder="Phone"
                                keyboardType="phone-pad"
                                onChangeText={handlePhone}
                                value={phone}
                                style={{ padding: 10, fontSize: 16, color: 'black' }}
                            />
                            {phone.length < 1 ? null : phoneVerify ? (
                                <Icon.CheckCircle stroke="#4CAF50" />
                            ) : (
                                <Icon.AlertCircle stroke="#F44336" />
                            )}
                        </View>

                        {/* Password Input */}
                        <View style={{ borderColor: passwordVerify ? 'green' : 'gray', borderWidth: 1, borderRadius: 8, marginBottom: 10 }}>
                            <TextInput
                                placeholder="Password"
                                secureTextEntry={!showPassword}
                                onChangeText={handlePassword}
                                value={password}
                                style={{ padding: 10, fontSize: 16, color: 'black' }}
                            />
                            {password.length < 1 ? null : passwordVerify ? (
                                <Icon.CheckCircle stroke="#4CAF50" />
                            ) : (
                                <Icon.AlertCircle stroke="#F44336" />
                            )}
                        </View>

                        {/* Confirm Password Input */}
                        <View style={{ borderColor: cpasswordVerify ? 'green' : 'gray', borderWidth: 1, borderRadius: 8, marginBottom: 20 }}>
                            <TextInput
                                placeholder="Confirm Password"
                                secureTextEntry={!showPassword}
                                onChangeText={handleCpassword}
                                value={cpassword}
                                style={{ padding: 10, fontSize: 16, color: 'black' }}
                            />
                            {cpassword.length < 1 ? null : cpasswordVerify ? (
                                <Icon.CheckCircle stroke="#4CAF50" />
                            ) : (
                                <Icon.AlertCircle stroke="#F44336" />
                            )}
                        </View>

                        {/* Error Message */}
                        {user && (
                            <Text style={{ color: 'red', textAlign: 'center', fontSize: 14 }}>User already exists, please log in instead.</Text>
                        )}

                        {/* Register Button */}
                        <TouchableOpacity
                            onPress={handleRegister}
                            style={{
                                backgroundColor: '#4CAF50',
                                paddingVertical: 12,
                                borderRadius: 30,
                                marginTop: 20,
                            }}
                        >
                            <Text style={{ color: 'white', textAlign: 'center', fontSize: 18, fontWeight: '600' }}>Register</Text>
                        </TouchableOpacity>

                        {/* Login Navigation */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                            <Text>Already a member? </Text>
                            <Pressable onPress={() => navigation.navigate('Login')}>
                                <Text style={{ color: 'green', fontWeight: '600' }}>Login</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Text */}
                <View style={{ position: 'absolute', bottom: 10, width: '100%' }}>
                    <Text style={{ textAlign: 'center', color: 'black', fontSize: 14, fontWeight: 'bold' }}>
                        THIS APP IS DEVELOPED BY TOJIN & JAIBY
                    </Text>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
}
