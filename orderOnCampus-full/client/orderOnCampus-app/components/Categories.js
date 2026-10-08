import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Icon from "react-native-feather";
import { categories } from '../constants';
import CanteenSlide from './CanteenSlide';
import { API_URL } from '../config/api';

export default function Categories() {
    const [allCanteens, setAllCanteens] = useState([]);
    const [activeCategory, setActiveCategory] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState([]);

    const getCanteens = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/canteens/get-canteens`);
            setAllCanteens(response.data.data);
        } catch (error) {
            console.error('Error fetching canteens:', error);
        }
    }, []);

    useEffect(() => {
        getCanteens();
    }, [getCanteens]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        const filteredResults = allCanteens.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredData(filteredResults);
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Icon.Search height="20" width="20" stroke="gray" />
                    <TextInput
                        placeholder='Search Canteen'
                        style={styles.searchInput}
                        onChangeText={handleSearch}
                        value={searchQuery}
                    />
                </View>
            </View>

            {/* Categories Selection */}
            <View style={styles.categoriesContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    renderItem={({ item }) => {
                        const isActive = item.id === activeCategory;
                        return (
                            <TouchableOpacity
                                style={[styles.categoryButton, isActive && styles.activeCategory]}
                                onPress={() => setActiveCategory(item.id)}
                            >
                                <Text style={[styles.categoryText, isActive && styles.activeCategoryText]}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    keyExtractor={(item) => item.id.toString()}
                />
            </View>

            {/* Canteen Slide */}
            <CanteenSlide filteredData={filteredData.length ? filteredData : allCanteens} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        backgroundColor: '#FFF',
    },
    searchContainer: {
        marginTop: 16,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        width: '90%',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#333',
    },
    categoriesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    categoryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 50,
        marginRight: 12,
        backgroundColor: '#E8E8E8',
    },
    activeCategory: {
        backgroundColor: '#2D6A4F',
        borderColor: '#2D6A4F',
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 16,
        color: '#777',
    },
    activeCategoryText: {
        color: '#FFF',
    },
});
