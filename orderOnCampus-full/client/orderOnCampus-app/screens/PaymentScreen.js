import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ImageBackground, Alert, Modal, ActivityIndicator, TextInput, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Icon from "react-native-feather";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { QRCodeBase64 } from '../assets/qr-code';
import * as FileSystem from 'expo-file-system';

export default function PaymentScreen({ route }) {
    const { orderTotal } = route.params;
    const navigation = useNavigation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showUPIApps, setShowUPIApps] = useState(false);
    const [selectedUPIApp, setSelectedUPIApp] = useState(null);
    const [showCardModal, setShowCardModal] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedback, setFeedback] = useState({
        foodRating: '',
        appRating: '',
        comments: ''
    });
    const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
    const [feedbackHistory, setFeedbackHistory] = useState('');
    
    // Mock UPI details
    const merchantUpiId = "merchant.upi@okaxis";
    const transactionNote = "Food Order Payment";
    
    const upiApps = [
        { id: 1, name: 'Google Pay', icon: require('../assets/gpay.png') },
        { id: 2, name: 'PhonePe', icon: require('../assets/phonepe.png') },
        { id: 3, name: 'Paytm', icon: require('../assets/paytm.png') }
    ];

    const generateUpiUrl = (app) => {
        const upiUrl = {
            'Google Pay': `gpay://upi/pay?pa=${merchantUpiId}&pn=Campus%20Food&am=${orderTotal}&tn=${transactionNote}&cu=INR`,
            'PhonePe': `phonepe://pay?pa=${merchantUpiId}&pn=Campus%20Food&am=${orderTotal}&tn=${transactionNote}&cu=INR`,
            'Paytm': `paytmmp://pay?pa=${merchantUpiId}&pn=Campus%20Food&am=${orderTotal}&tn=${transactionNote}&cu=INR`
        };
        return upiUrl[app] || null;
    };

    const handleUPIPayment = () => {
        setShowUPIApps(true);
    };

    const handleUPIAppSelect = async (app) => {
        setSelectedUPIApp(app);
        setShowUPIApps(false);
        
        if (app.name === 'Paytm') {
            // Direct success for Paytm without QR
            setIsProcessing(true);
            setShowPaymentModal(true);
            
            setTimeout(() => {
                setShowPaymentModal(false);
                setIsProcessing(false);
                handlePaymentSuccess();
            }, 2000);
        } else {
            // Show QR code for other apps
            setShowQRCode(true);
        }
    };

    const handleQRCodePress = async () => {
        if (!selectedUPIApp) return;

        const upiUrl = generateUpiUrl(selectedUPIApp.name);
        
        if (upiUrl) {
            try {
                const supported = await Linking.canOpenURL(upiUrl);
                
                if (supported) {
                    Alert.alert(
                        "Open UPI App",
                        `Would you like to open ${selectedUPIApp.name}?`,
                        [
                            {
                                text: "Cancel",
                                style: "cancel",
                                onPress: () => setShowQRCode(false)
                            },
                            {
                                text: "Open",
                                onPress: async () => {
                                    setShowQRCode(false);
                                    setIsProcessing(true);
                                    setShowPaymentModal(true);
                                    
                                    // Open UPI app
                                    await Linking.openURL(upiUrl);
                                    
                                    // Show processing screen
                                    setTimeout(() => {
                                        setShowPaymentModal(false);
                                        setIsProcessing(false);
                                        successCallback();
                                    }, 3000);
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert('Error', `${selectedUPIApp.name} is not installed`);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to open UPI app');
            }
        }
    };

    const handleCardPayment = () => {
        if (!cardNumber || !expiryDate || !cvv) {
            Alert.alert('Error', 'Please fill in all card details');
            return;
        }

        setShowCardModal(false);
        setIsProcessing(true);
        setShowPaymentModal(true);

        setTimeout(() => {
            setShowPaymentModal(false);
            setIsProcessing(false);
            if (Math.random() < 0.9) {
                successCallback();
            } else {
                failureCallback();
            }
        }, 2000);
    };

    const handlePaymentSuccess = () => {
        Alert.alert(
            "Payment Successful!",
            "Thank you for your order.",
            [
                {
                    text: "Give Feedback",
                    onPress: () => setShowFeedbackForm(true)
                }
            ]
        );
    };

    const handleFeedbackSubmit = async () => {
        try {
            const timestamp = new Date().toISOString();
            const feedbackText = `
Date: ${timestamp}
Order Total: ₹${orderTotal}
Food Rating: ${feedback.foodRating}/5
App Rating: ${feedback.appRating}/5
Comments: ${feedback.comments}
----------------------------------------
`;

            const filePath = `${FileSystem.documentDirectory}feedback.txt`;
            
            // Check if file exists
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            if (fileInfo.exists) {
                // Append to existing file
                const existingContent = await FileSystem.readAsStringAsync(filePath);
                await FileSystem.writeAsStringAsync(filePath, existingContent + feedbackText);
            } else {
                // Create new file
                await FileSystem.writeAsStringAsync(filePath, feedbackText);
            }

            Alert.alert(
                "Thank You!",
                "Your feedback has been recorded.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setShowFeedbackForm(false);
                            navigation.navigate('Home');
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error saving feedback:', error);
            Alert.alert("Error", "Could not save feedback");
        }
    };

    const successCallback = () => {
        Alert.alert(
            "Payment Successful ✅",
            `Your payment of ₹${orderTotal} has been processed successfully!`,
            [{ text: "OK", onPress: () => navigation.navigate('FoodPrep') }]
        );
    };

    const failureCallback = () => {
        Alert.alert(
            "Payment Failed ❌",
            "Transaction declined by bank. Please try again or use a different payment method.",
            [{ text: "OK" }]
        );
    };

    // Update QR Code Modal
    const QRCodeModal = () => (
        <Modal
            transparent={true}
            visible={showQRCode}
            animationType="slide"
        >
            <View style={styles.modalContainer}>
                <View style={styles.qrModal}>
                    <Text style={styles.modalTitle}>Scan QR Code to Pay</Text>
                    <TouchableOpacity onPress={handleQRCodePress}>
                        <View style={styles.qrCodeContainer}>
                            <Image 
                                source={{ uri: QRCodeBase64 }}
                                style={styles.qrCode}
                                resizeMode="contain"
                            />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.qrText}>Amount: ₹{orderTotal}</Text>
                    <Text style={styles.qrSubText}>
                        {selectedUPIApp ? `Tap QR code to open ${selectedUPIApp.name}` : 'Open any UPI app and scan'}
                    </Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => {
                            setShowQRCode(false);
                            setSelectedUPIApp(null);
                        }}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Add Feedback Form Modal
    const FeedbackFormModal = () => (
        <Modal
            transparent={true}
            visible={showFeedbackForm}
            animationType="slide"
        >
            <View style={styles.modalContainer}>
                <View style={styles.feedbackModal}>
                    <Text style={styles.modalTitle}>Please Rate Your Experience</Text>
                    
                    <Text style={styles.feedbackLabel}>Food Quality (1-5)</Text>
                    <TextInput
                        style={styles.feedbackInput}
                        value={feedback.foodRating}
                        onChangeText={(text) => setFeedback({...feedback, foodRating: text})}
                        keyboardType="numeric"
                        maxLength={1}
                        placeholder="Rate 1-5"
                    />

                    <Text style={styles.feedbackLabel}>App Experience (1-5)</Text>
                    <TextInput
                        style={styles.feedbackInput}
                        value={feedback.appRating}
                        onChangeText={(text) => setFeedback({...feedback, appRating: text})}
                        keyboardType="numeric"
                        maxLength={1}
                        placeholder="Rate 1-5"
                    />

                    <Text style={styles.feedbackLabel}>Additional Comments</Text>
                    <TextInput
                        style={[styles.feedbackInput, styles.feedbackComments]}
                        value={feedback.comments}
                        onChangeText={(text) => setFeedback({...feedback, comments: text})}
                        multiline
                        placeholder="Share your thoughts..."
                    />

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleFeedbackSubmit}
                    >
                        <Text style={styles.submitButtonText}>Submit Feedback</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Add this function to read feedback
    const viewFeedbackHistory = async () => {
        try {
            const filePath = `${FileSystem.documentDirectory}feedback.txt`;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(filePath);
                setFeedbackHistory(content);
                setShowFeedbackHistory(true);
            } else {
                Alert.alert("No Feedback", "No feedback has been recorded yet.");
            }
        } catch (error) {
            Alert.alert("Error", "Could not read feedback history.");
        }
    };

    // Add Feedback History Modal
    const FeedbackHistoryModal = () => (
        <Modal
            transparent={true}
            visible={showFeedbackHistory}
            animationType="slide"
        >
            <View style={styles.modalContainer}>
                <View style={styles.feedbackHistoryModal}>
                    <Text style={styles.modalTitle}>Feedback History</Text>
                    <ScrollView style={styles.feedbackHistoryScroll}>
                        <Text style={styles.feedbackHistoryText}>
                            {feedbackHistory}
                        </Text>
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowFeedbackHistory(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.background}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => navigation.goBack()}
                    >
                        <Icon.ArrowLeft stroke="#2A4834" strokeWidth={3} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payment</Text>
                </View>

                <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amount}>₹{orderTotal}</Text>
                </View>

                <View style={styles.paymentOptions}>
                    <TouchableOpacity style={styles.paymentOption} onPress={() => setShowQRCode(true)}>
                        <View style={styles.paymentOptionContent}>
                            <Image source={require('../assets/qr-code.png')} style={styles.icon} />
                            <View>
                                <Text style={styles.paymentText}>Scan QR Code</Text>
                                <Text style={styles.paymentSubText}>Pay using any UPI app</Text>
                            </View>
                        </View>
                        <Icon.ChevronRight stroke="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.paymentOption} onPress={handleUPIPayment}>
                        <View style={styles.paymentOptionContent}>
                            <Image source={require('../assets/upi.jpg')} style={styles.icon} />
                            <View>
                                <Text style={styles.paymentText}>UPI Apps</Text>
                                <Text style={styles.paymentSubText}>Pay directly through UPI apps</Text>
                            </View>
                        </View>
                        <Icon.ChevronRight stroke="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.paymentOption} onPress={() => setShowCardModal(true)}>
                        <View style={styles.paymentOptionContent}>
                            <Image source={require('../assets/card.png')} style={styles.icon} />
                            <View>
                                <Text style={styles.paymentText}>Card Payment</Text>
                                <Text style={styles.paymentSubText}>Credit/Debit Card</Text>
                            </View>
                        </View>
                        <Icon.ChevronRight stroke="#666" />
                    </TouchableOpacity>
                </View>

                {/* UPI Apps Modal */}
                <Modal
                    transparent={true}
                    visible={showUPIApps}
                    animationType="slide"
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.upiAppsModal}>
                            <Text style={styles.modalTitle}>Select UPI App</Text>
                            {upiApps.map((app) => (
                                <TouchableOpacity
                                    key={app.id}
                                    style={styles.upiAppButton}
                                    onPress={() => handleUPIAppSelect(app)}
                                >
                                    <Image
                                        source={app.icon}
                                        style={styles.upiAppIcon}
                                    />
                                    <Text style={styles.upiAppText}>{app.name}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowUPIApps(false)}
                            >
                                <Text style={styles.closeButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Card Details Modal */}
                <Modal
                    transparent={true}
                    visible={showCardModal}
                    animationType="slide"
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.cardModal}>
                            <Text style={styles.modalTitle}>Enter Card Details</Text>
                            <TextInput
                                style={styles.cardInput}
                                placeholder="Card Number"
                                value={cardNumber}
                                onChangeText={setCardNumber}
                                keyboardType="numeric"
                                maxLength={16}
                            />
                            <View style={styles.cardExtraDetails}>
                                <TextInput
                                    style={[styles.cardInput, { width: '45%' }]}
                                    placeholder="MM/YY"
                                    value={expiryDate}
                                    onChangeText={setExpiryDate}
                                    maxLength={5}
                                />
                                <TextInput
                                    style={[styles.cardInput, { width: '45%' }]}
                                    placeholder="CVV"
                                    value={cvv}
                                    onChangeText={setCvv}
                                    keyboardType="numeric"
                                    maxLength={3}
                                    secureTextEntry
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.payButton}
                                onPress={handleCardPayment}
                            >
                                <Text style={styles.payButtonText}>Pay ₹{orderTotal}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setShowCardModal(false)}
                            >
                                <Text style={styles.closeButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Payment Processing Modal */}
                <Modal
                    transparent={true}
                    visible={showPaymentModal}
                    animationType="fade"
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <ActivityIndicator size="large" color="#2A4834" />
                            <Text style={styles.modalText}>
                                {selectedUPIApp ? `Connecting to ${selectedUPIApp.name}...` : 'Processing Payment...'}
                            </Text>
                            <Text style={styles.modalSubText}>Please do not close the app</Text>
                        </View>
                    </View>
                </Modal>

                {/* Add QR Code Modal */}
                <QRCodeModal />

                <FeedbackFormModal />

                {/* Add this button somewhere in your UI */}
                <TouchableOpacity 
                    style={styles.viewFeedbackButton}
                    onPress={viewFeedbackHistory}
                >
                    <Text style={styles.viewFeedbackButtonText}>View Feedback History</Text>
                </TouchableOpacity>

                {/* Add this with other modals */}
                <FeedbackHistoryModal />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    background: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa', // Light background color instead of image
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    headerTitle: {
        fontSize: 24,
        marginLeft: 15,
        fontWeight: '600',
        color: '#2A4834',
    },
    amountContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        marginBottom: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    amountLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
    },
    amount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2A4834',
    },
    paymentOptions: {
        marginTop: hp('5%'),
        paddingHorizontal: wp('5%'),
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    paymentOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        width: 40,
        height: 40,
        marginRight: 15,
        borderRadius: 8,
    },
    paymentText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    paymentSubText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        width: wp('80%'),
    },
    modalText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2A4834',
        marginTop: 15,
    },
    modalSubText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    upiAppsModal: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        width: wp('90%'),
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2A4834',
    },
    upiAppButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#f8f8f8',
        width: '100%',
        marginBottom: 10,
    },
    upiAppIcon: {
        width: 30,
        height: 30,
        marginRight: 15,
    },
    upiAppText: {
        fontSize: 16,
        color: '#333',
    },
    cardModal: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        width: wp('90%'),
    },
    cardInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    cardExtraDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    payButton: {
        backgroundColor: '#2A4834',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    payButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 15,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#666',
        fontSize: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    qrModal: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        width: wp('90%'),
        alignItems: 'center',
    },
    qrCodeContainer: {
        backgroundColor: '#f8f8f8',
        padding: 15,
        borderRadius: 10,
        marginVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrCode: {
        width: wp('60%'),
        height: wp('60%'),
        borderRadius: 10,
    },
    qrText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2A4834',
        marginTop: 10,
    },
    qrSubText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
        marginBottom: 20,
    },
    feedbackModal: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        width: wp('90%'),
        maxHeight: hp('80%'),
    },
    feedbackLabel: {
        fontSize: 16,
        color: '#2A4834',
        marginBottom: 5,
        marginTop: 10,
    },
    feedbackInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    feedbackComments: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#2A4834',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    feedbackHistoryModal: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        width: wp('90%'),
        maxHeight: hp('80%'),
    },
    feedbackHistoryScroll: {
        maxHeight: hp('60%'),
        marginVertical: 15,
    },
    feedbackHistoryText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    viewFeedbackButton: {
        backgroundColor: '#2A4834',
        padding: 15,
        borderRadius: 8,
        marginHorizontal: wp('5%'),
        marginTop: 10,
        alignItems: 'center',
    },
    viewFeedbackButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});
