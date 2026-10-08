import { Platform } from 'react-native';

const getBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    if (Platform.OS === 'web') {
        return 'http://localhost:5001';
    }
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5001';
    }
    return 'http://localhost:5001';
};

export const API_URL = getBaseUrl();
