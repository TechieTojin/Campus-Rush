import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import * as Icon from "react-native-feather";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { selectToken } from '../slices/AuthSlice';

export default function UserScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editableName, setEditableName] = useState("");
  const [editableEmail, setEditableEmail] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);  // Add loading state
  const [error, setError] = useState("");  // Add error state

  const navigation = useNavigation();
  const token = useSelector(selectToken);
  const dispatch = useDispatch();

  useEffect(() => {
    if (token && token.data) {
      setName(token.data.name || "");  // Add fallback in case the name is missing
      setEmail(token.data.email || ""); // Add fallback in case the email is missing
      setEditableName(token.data.name || "");
      setEditableEmail(token.data.email || "");
      setIsLoading(false);
    } else {
      setError("Failed to load user data");
      setIsLoading(false);
    }
  }, [token]);

  const handleLogout = () => {
    navigation.navigate('Login');
    AsyncStorage.setItem('isLoggedIn', '');
    AsyncStorage.setItem('token', '');
  };

  const handleEdit = () => {
    setName(editableName);
    setEmail(editableEmail);
    setIsModalVisible(false); // Hide modal after saving
  };

  const handleHelp = () => {
    setIsHelpVisible(true); // Show contact information modal
  };

  const handleCloseHelp = () => {
    setIsHelpVisible(false); // Hide contact information modal
  };

  if (isLoading) {
    return <Text>Loading...</Text>;  // Display loading message
  }

  if (error) {
    return <Text>{error}</Text>;  // Display error message
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={require('../assets/pic.jpg')}
            style={styles.profileImage}
          />
          <View style={styles.profileText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>

        {/* Profile Options */}
        <View style={styles.optionContainer}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Items */}
        <View style={styles.navItems}>
          <NavItem title="Previous Orders" onPress={() => navigation.navigate('Orders')} />
          <NavItem title="Offers and Promo" onPress={() => navigation.navigate('Offers')} />
          <NavItem title="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
          <NavItem title="Security" onPress={() => navigation.navigate('Security')} />
          <NavItem title="Help" onPress={handleHelp} />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TextInput
                style={styles.inputField}
                value={editableName}
                onChangeText={setEditableName}
                placeholder="Enter your name"
              />
              <TextInput
                style={styles.inputField}
                value={editableEmail}
                onChangeText={setEditableEmail}
                placeholder="Enter your email"
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Help Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isHelpVisible}
        onRequestClose={handleCloseHelp}
      >
        <TouchableWithoutFeedback onPress={handleCloseHelp}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Contact Support</Text>
              <Text style={styles.helpText}>For any assistance, please contact:</Text>
              <Text style={styles.helpEmail}>support1@example.com</Text>
              <Text style={styles.helpEmail}>support2@example.com</Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCloseHelp}
              >
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// Reusable NavItem Component
const NavItem = ({ title, onPress }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <View style={styles.navTextContainer}>
      <Text style={styles.navItemText}>{title}</Text>
    </View>
    <Icon.ChevronRight stroke="black" width={20} height={20} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: wp('5%'),
  },
  scrollView: {
    paddingBottom: hp('10%'),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp('3%'),
    marginBottom: hp('4%'),
  },
  profileImage: {
    width: hp('8%'),
    height: hp('8%'),
    borderRadius: hp('4%'),
  },
  profileText: {
    marginLeft: wp('5%'),
  },
  name: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
  },
  email: {
    fontSize: hp('2%'),
    color: 'gray',
  },
  optionContainer: {
    marginTop: hp('5%'),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: hp('2.2%'),
    fontWeight: 'bold',
  },
  editButton: {
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('5%'),
    borderRadius: hp('1%'),
    backgroundColor: '#007bff',
  },
  editText: {
    color: 'white',
    fontSize: hp('2%'),
  },
  navItems: {
    marginTop: hp('3%'),
  },
  navItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp('2%'),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navTextContainer: {
    flexDirection: 'row',
  },
  navItemText: {
    fontSize: hp('2%'),
  },
  logoutButton: {
    marginTop: hp('3%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#ff6f61',
    borderRadius: hp('1%'),
  },
  logoutText: {
    color: 'white',
    textAlign: 'center',
    fontSize: hp('2.5%'),
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: wp('5%'),
    borderRadius: hp('2%'),
    width: wp('80%'),
  },
  modalTitle: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
    marginBottom: hp('3%'),
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: wp('3%'),
    marginBottom: hp('2%'),
    borderRadius: hp('1%'),
    fontSize: hp('2%'),
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: hp('1.5%'),
    borderRadius: hp('1%'),
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: hp('2%'),
  },
  helpText: {
    fontSize: hp('2%'),
    marginBottom: hp('2%'),
  },
  helpEmail: {
    fontSize: hp('2%'),
    color: '#007bff',
    marginBottom: hp('1%'),
  },
});
