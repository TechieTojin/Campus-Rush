import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import * as Icon from "react-native-feather";
import { useNavigation } from '@react-navigation/native';

const cafes = [
    {
        name: 'Nadhini',
        location: 'North Campus',
        menu: [
            { name: 'Coffee', price: 10 },
            { name: 'Tea', price: 12 },
            { name: 'Samosa', price: 15 },
            // Add more items as needed...
        ]
    },
    {
        name: 'Mingos',
        location: 'South Campus',
        menu: [
            { name: 'Burger', price: 50 },
            { name: 'Fries', price: 30 },
            { name: 'Pizza', price: 100 },
            // Add more items as needed...
        ]
    },
    // Add more cafes as needed...
];

// Detailed responses for numbered options
const detailedResponses = {
    // Canteen specific details
    'nadhini_1': 'Coffee at Nadhini is a premium blend sourced from local farms. It\'s brewed fresh every hour and available in various sizes. Price: ₹10. Most popular during morning hours between 7-9 AM.',
    'nadhini_2': 'Tea at Nadhini is made with organic tea leaves and fresh milk. Available in regular and masala varieties. Price: ₹12. Students often pair it with samosas for an evening snack.',
    'nadhini_3': 'Samosa at Nadhini is a crispy pastry filled with spiced potatoes and peas. Freshly fried throughout the day. Price: ₹15. Comes with mint and tamarind chutneys.',
    
    'mingos_1': 'Burgers at Mingos are made with fresh buns baked in-house daily. Available in veg and chicken varieties with various toppings. Price: ₹50. Comes with a side of ketchup and mayo.',
    'mingos_2': 'Fries at Mingos are crispy on the outside, soft on the inside. Made from locally sourced potatoes. Price: ₹30. Available in regular and masala flavors.',
    'mingos_3': 'Pizza at Mingos comes in 8-inch personal size with various toppings. Baked in a stone oven for authentic taste. Price: ₹100. Most popular flavors are Margherita and Pepperoni.',
    
    // Menu options
    'menu_1': 'Nadhini Canteen is located in North Campus near the Science Block. Open from 7:30 AM to 9:30 PM on weekdays and 8:00 AM to 9:00 PM on weekends. Known for affordable snacks and beverages. Seating capacity of 50 people. Most popular items include Tea, Coffee, and Samosa.',
    'menu_2': 'Mingos Canteen is located in South Campus near the Engineering Block. Open from 8:00 AM to 10:00 PM daily. Known for fast food and international cuisine. Seating capacity of 80 people with outdoor seating available. Most popular items include Burger, Pizza, and Pasta.',
    
    // Budget options
    'budget_1': 'Coffee (₹10) is available at Nadhini and Central Canteen. It\'s a premium blend sourced from local farms, brewed fresh every hour. Available in small and large sizes. Most popular during morning hours between 7-9 AM and during evening study sessions.',
    'budget_2': 'Tea (₹12) is available at Nadhini and most other canteens. Made with organic tea leaves and fresh milk. Available in regular, masala, and lemon varieties. Students often pair it with snacks for an evening break.',
    'budget_3': 'Biscuits (₹10) at Nadhini include various popular brands as well as freshly baked cookies. Available in packs of 4-6 pieces. Perfect companion for tea or coffee.',
    'budget_4': 'Soda (₹20) is available at all canteens in various flavors including cola, lemon, orange, and jeera. Served chilled. Refills available at 50% discount.',
    
    // Mid-range options
    'mid_range_1': 'Burger (₹50) at Mingos is made with fresh buns baked in-house daily. Available in veg (potato or mixed vegetable patty) and chicken varieties. Comes with lettuce, tomato, onion, and cheese. Served with a side of ketchup and mayo.',
    'mid_range_2': 'Sandwich (₹40) is available at Fast Food Corner and Mingos. Made with brown or white bread, filled with vegetables, cheese, and choice of sauce. Can be ordered grilled or plain. Served with a small side of chips.',
    'mid_range_3': 'Dosa (₹60) from South Indian Canteen is a crispy rice crepe available in plain, masala, onion, and cheese varieties. Served with sambar and coconut chutney. Made fresh to order on a hot griddle.',
    'mid_range_4': 'Paratha (₹50) from North Indian Canteen is a whole wheat flatbread stuffed with various fillings like potato, cauliflower, or paneer. Served with yogurt and pickle. Available throughout the day.',
    
    // Premium options
    'premium_1': 'Full Meals (₹150) from Central Canteen includes rice, 4 rotis, 2 vegetable curries, dal, rasam, sambar, curd, pickle, papad, and dessert. The most comprehensive meal option on campus. Available for lunch and dinner. Vegetarian and non-vegetarian options available.',
    'premium_2': 'Pizza (₹100) at Mingos comes in 8-inch personal size with various toppings. Options include Margherita, Pepperoni, Chicken, Veggie Supreme, and Paneer Tikka. Baked in a stone oven for authentic taste. Extra cheese available for ₹20 more.',
    'premium_3': 'Thali (₹120) from North and South Indian Canteens includes a balanced meal with rice, 3 rotis, 2 vegetable curries, dal, raita, pickle, and dessert. Regional specialties included based on the canteen. Unlimited refills of rice and dal available.',
    'premium_4': 'Special Biryani (₹140) is available at Central Canteen on Wednesdays and weekends. Fragrant basmati rice cooked with choice of vegetables, chicken, or mutton. Served with raita and salan gravy. Pre-ordering recommended during peak hours.',
    
    // Non-vegetarian options
    'non_veg_1': 'Butter Chicken (₹180) from North Indian Canteen is a creamy, tomato-based curry with tender chicken pieces. Cooked in a traditional clay oven first, then simmered in a rich gravy. Served with naan or rice. Available for lunch and dinner. Contains dairy - inform staff of allergies.',
    'non_veg_2': 'Chicken Biryani (₹160) from Central Canteen features fragrant basmati rice layered with marinated chicken and aromatic spices. Cooked in the traditional dum style. Served with raita and salan gravy. Available for lunch and dinner on Wednesdays and weekends.',
    'non_veg_3': 'Fish Curry (₹200) from Coastal Corner is made with fresh river fish cooked in a tangy tomato-based gravy with coconut milk. Flavored with curry leaves and mustard seeds. Served with rice or appam. Available only on Fridays and weekends.',
    
    // Lunch options
    'lunch_1': 'Thali (₹120) is the most popular lunch option across campus. Includes a balanced meal with rice, 3 rotis, 2 vegetable curries, dal, raita, pickle, and dessert. Regional specialties included based on the canteen. Unlimited refills of rice and dal available from 12-2 PM.',
    'lunch_2': 'Rice and Curry (₹100) is available at all canteens. Steamed rice served with choice of vegetable, chicken, or fish curry. Comes with papad and pickle. Quick option for students in a hurry between classes.',
    'lunch_3': 'Biryani (₹140) is available at Central Canteen. Fragrant basmati rice cooked with choice of vegetables, chicken, or mutton. Served with raita and salan gravy. Special discount of 10% for groups of 4 or more students.',
    
    // Snack options
    'snacks_1': 'Samosa (₹15) at Nadhini is a crispy pastry filled with spiced potatoes and peas. Freshly fried throughout the day. Comes with mint and tamarind chutneys. Buy 3 get 1 free offer available during evening hours.',
    'snacks_2': 'Vada (₹12) from South Indian Canteen is a savory donut-shaped fritter made from lentil batter. Crispy outside, soft inside. Served with coconut chutney and sambar. Available throughout the day.',
    'snacks_3': 'Sandwich (₹40) from Fast Food Corner is made with brown or white bread, filled with vegetables, cheese, and choice of sauce. Can be ordered grilled or plain. Served with a small side of chips. Perfect for a quick bite between classes.',
    
    // Recommendation details
    'recommend_1': 'Butter Chicken (₹180) from North Indian Canteen is a creamy, tomato-based curry with tender chicken pieces. Cooked in a traditional clay oven first, then simmered in a rich gravy. Served with naan or rice. Available for lunch and dinner. Contains dairy - inform staff of allergies.',
    'recommend_2': 'Masala Dosa (₹60) from South Indian Canteen is a crispy rice crepe filled with spiced potato filling. Served with sambar and coconut chutney. Made fresh to order on a hot griddle. Available all day but most popular for breakfast. Gluten-free and vegan-friendly.',
    'recommend_3': 'Veg Biryani (₹120) from Central Canteen is a fragrant rice dish cooked with mixed vegetables and aromatic spices. Served with raita and salan gravy. Cooked in the traditional dum style. Available for lunch and dinner. Can be made spicier on request.',
    
    // Spicy food details
    'spicy_1': 'Andhra Style Chicken (₹160) from South Indian Canteen is known for its fiery heat level. Marinated with red chilies and traditional spices, then slow-cooked to perfection. Served with rice or parotta. Available for lunch and dinner. Warning: extremely spicy!',
    'spicy_2': 'Schezwan Noodles (₹100) from Chinese Corner features hand-pulled noodles stir-fried with vegetables in a spicy Schezwan sauce. Garnished with spring onions and sesame seeds. Available all day. Spice level can be adjusted on request.',
    'spicy_3': 'Spicy Veg Manchurian (₹90) from Fast Food Corner consists of vegetable dumplings fried crisp and tossed in a spicy, tangy sauce. Garnished with chopped garlic and coriander. Available all day. Perfect as a starter or side dish.',
    
    // Vegetarian options details
    'vegetarian_1': 'Paneer Butter Masala (₹140) from North Indian Canteen features fresh cottage cheese cubes in a rich tomato and butter gravy. Flavored with fenugreek leaves and cream. Served with naan or rice. Available for lunch and dinner. Contains dairy.',
    'vegetarian_2': 'Veg Thali (₹120) from Central Canteen is a complete meal with rice, 3 rotis, 2 vegetable curries, dal, raita, pickle, and dessert. Offers a balanced nutritional profile. Available for lunch and dinner. Unlimited refills of rice and dal available.',
    'vegetarian_3': 'Mixed Veg Curry (₹90) from South Indian Canteen contains seasonal vegetables cooked in a coconut-based gravy with South Indian spices. Served with rice or parotta. Available all day. Vegan-friendly option available on request.',
    
    // Breakfast options details
    'breakfast_1': 'Idli Sambar (₹40) from South Indian Canteen consists of 4 steamed rice cakes served with lentil soup and coconut chutney. Made fresh every morning. Available from 7:30 AM to 11:00 AM. Light on the stomach and protein-rich.',
    'breakfast_2': 'Aloo Paratha (₹50) from North Indian Canteen is a whole wheat flatbread stuffed with spiced potato filling. Served with yogurt and pickle. Available from 7:30 AM to 11:00 AM. Filling and energizing breakfast option.',
    'breakfast_3': 'Poha (₹30) from Central Canteen is flattened rice tempered with mustard seeds, curry leaves, and mixed with onions, peanuts, and spices. Garnished with coriander and lemon. Available from 7:30 AM to 11:00 AM. Light and easy to digest.',
    
    // Dinner options details
    'dinner_1': 'Full Meals (₹150) from Central Canteen includes rice, 4 rotis, 2 vegetable curries, dal, rasam, sambar, curd, pickle, papad, and dessert. The most comprehensive meal option on campus. Available from 7:00 PM to 9:30 PM. Vegetarian and non-vegetarian options available.',
    'dinner_2': 'Chapati with Curry (₹80) from North Indian Canteen offers 4 whole wheat flatbreads served with a choice of vegetable or chicken curry. Simple yet satisfying dinner option. Available from 7:00 PM to 9:30 PM. Curry can be customized based on spice preference.',
    'dinner_3': 'Mixed Fried Rice (₹110) from Chinese Corner features basmati rice stir-fried with mixed vegetables, egg, and chicken in soy and chili sauce. Served with a side of manchurian gravy. Available from 7:00 PM to 9:30 PM. Vegetarian option available.',
    
    // Healthy options details
    'healthy_1': 'Sprouts Salad (₹60) from Health Corner contains mixed sprouts, cucumber, tomato, onion, and bell peppers tossed in a lemon-olive oil dressing. Topped with roasted flax seeds. Available all day. High in protein and fiber.',
    'healthy_2': 'Grilled Sandwich (₹80) from Fast Food Corner is made with whole grain bread filled with grilled vegetables, low-fat cheese, and homemade hummus. Served with a side of mixed greens. Available all day. Contains approximately 350 calories.',
    'healthy_3': 'Fruit Bowl (₹70) from Juice Corner offers a mix of seasonal fruits like apple, banana, papaya, and watermelon. Topped with honey and chia seeds. Available all day. Rich in vitamins and antioxidants.',
    
    // Default menu options
    'default_1': 'Our campus has several canteens offering a variety of cuisines:\n\n• Nadhini (North Campus): Known for affordable snacks, beverages, and quick bites\n• Mingos (South Campus): Famous for fast food and international cuisine\n• North Indian Canteen (Central Campus): Specializes in authentic North Indian dishes\n• South Indian Canteen (East Campus): Offers traditional South Indian delicacies\n• Chinese Corner (West Campus): Serves Indo-Chinese fusion dishes\n\nAll canteens accept cash, campus cards, and mobile payments.',
    
    'default_2': 'Price ranges across campus canteens:\n\n• Budget options (Under ₹30): Tea, coffee, biscuits, samosa, vada, poha, soda\n• Mid-range options (₹30-₹80): Sandwiches, burgers, dosas, parathas, fried rice\n• Premium options (₹80-₹150): Full meals, thalis, special dishes, pizzas\n\nStudent discounts of 10% are available with valid ID cards at all canteens. Meal plans offering 15% discount are available for monthly subscriptions.',
    
    'default_3': 'Our most highly recommended dishes across campus:\n\n• Butter Chicken from North Indian Canteen - Rich, creamy tomato-based curry with tender chicken pieces\n• Masala Dosa from South Indian Canteen - Crispy rice crepe with spiced potato filling\n• Veg Biryani from Central Canteen - Fragrant rice with mixed vegetables and aromatic spices\n• Schezwan Noodles from Chinese Corner - Hand-pulled noodles stir-fried with vegetables in spicy sauce\n• Grilled Sandwich from Fast Food Corner - Whole grain bread with grilled vegetables and cheese\n\nAll these dishes consistently receive top ratings from students and faculty.',
    
    'default_4': 'Special dishes available on campus:\n\n• Monday: Pav Bhaji at Fast Food Corner\n• Tuesday: Chole Bhature at North Indian Canteen\n• Wednesday: Hyderabadi Biryani at Central Canteen\n• Thursday: Mysore Masala Dosa at South Indian Canteen\n• Friday: Manchurian Noodles at Chinese Corner\n• Weekends: Chef\'s Special Thali at all canteens\n\nSpecial festival menus are also available during major celebrations throughout the academic year.',
    
    // Price range options
    'price_range_1': 'Budget options under ₹30 include tea, coffee, biscuits, samosa, vada, poha, and soda. These are perfect for quick snacks between classes or for students on a tight budget. Most budget items are available at all canteens, with Nadhini offering the widest selection of affordable options.',
    'price_range_2': 'Mid-range options (₹30-₹80) include sandwiches, burgers, dosas, parathas, and fried rice. These items are substantial enough for a light meal. Mingos and Fast Food Corner specialize in mid-range options with good portion sizes and quality ingredients.',
    'price_range_3': 'Premium options (₹80-₹150) include full meals, thalis, special dishes, and pizzas. These are complete meals with multiple components. Central Canteen and North Indian Canteen offer the best premium options with unlimited refills on select items.',
    
    // Food type options
    'food_type_1': 'Our campus offers a wide variety of vegetarian options across all canteens. From simple snacks like samosas and vadas to complete meals like thalis and special curries. South Indian Canteen and Central Canteen have the most extensive vegetarian menus with regional specialties.',
    'food_type_2': 'Non-vegetarian options are available at North Indian Canteen, Central Canteen, and Chinese Corner. Popular choices include butter chicken, chicken biryani, fish curry, and chicken fried rice. All non-vegetarian items are prepared in separate cooking areas.',
    'food_type_3': 'For those who enjoy spicy food, South Indian Canteen and Chinese Corner offer the spiciest dishes on campus. Andhra-style chicken, schezwan noodles, and spicy manchurian are campus favorites. You can request extra spice for most dishes.',
    'food_type_4': 'Healthy options are available at all canteens, with Health Corner specializing in nutritious meals. Sprouts salad, grilled sandwiches, fruit bowls, and steamed items are popular among health-conscious students and faculty.',
    
    // Meal time options
    'meal_time_1': 'Breakfast is served from 7:30 AM to 11:00 AM at all canteens. South Indian Canteen is famous for idli, dosa, and vada; North Indian Canteen for parathas and poha; and Central Canteen for a mix of both. Coffee and tea are available throughout the day.',
    'meal_time_2': 'Lunch is served from 12:00 PM to 3:00 PM, with peak hours between 12:30 PM and 1:30 PM. Thalis, rice and curry combinations, and biryani are popular lunch options. Special lunch menus are available on weekdays with rotating specials.',
    'meal_time_3': 'Dinner is served from 7:00 PM to 9:30 PM at all canteens. Full meals, chapati with curry, and mixed fried rice are popular dinner choices. Night canteen services are available until 11:00 PM at Central Canteen for late-night study sessions.',
    'meal_time_4': 'Snacks are available throughout the day at all canteens. Nadhini and Fast Food Corner specialize in quick bites like samosas, vadas, sandwiches, and pastries. Evening snack specials are available from 4:00 PM to 6:00 PM with combo offers.'
};

export default function AIAssistantScreen() {
    const navigation = useNavigation();
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [canteenData, setCanteenData] = useState([]);
    const [chatHistory, setChatHistory] = useState([
        { 
            role: 'assistant', 
            content: 'Hello! I can help you find the best food and canteens on campus. Choose an option:\n1 Menu items\n2 Price information\n3 Food recommendations\n4 Special dishes' 
        }
    ]);
    // Track the current context to know which detailed responses to show
    const [currentContext, setCurrentContext] = useState('default');

    useEffect(() => {
        // Hardcoded canteen data for demonstration
        const hardcodedCanteens = [
            {
                _id: '1',
                name: 'Nadhini',
                location: 'North Campus',
                menu: [
                    { _id: 'n1', name: 'Coffee', price: 10 },
                    { _id: 'n2', name: 'Tea', price: 12 },
                    { _id: 'n3', name: 'Black Tea', price: 10 },
                    { _id: 'n4', name: 'Boast', price: 10 },
                    { _id: 'n5', name: 'Samosa', price: 15 },
                    { _id: 'n6', name: 'Vada', price: 12 },
                    { _id: 'n7', name: 'Biscuits', price: 10 },
                    { _id: 'n8', name: 'Chips', price: 20 }
                ]
            },
            {
                _id: '2',
                name: 'Mingos',
                location: 'South Campus',
                menu: [
                    { _id: 'm1', name: 'Burger', price: 50 },
                    { _id: 'm2', name: 'Fries', price: 30 },
                    { _id: 'm3', name: 'Pasta', price: 80 },
                    { _id: 'm4', name: 'Pizza', price: 100 },
                    { _id: 'm5', name: 'Sandwich', price: 40 },
                    { _id: 'm6', name: 'Salad', price: 60 },
                    { _id: 'm7', name: 'Ice Cream', price: 70 },
                    { _id: 'm8', name: 'Soda', price: 20 },
                    { _id: 'm9', name: 'Juice', price: 30 },
                    { _id: 'm10', name: 'Wrap', price: 90 }
                ]
            }
        ];

        setCanteenData(hardcodedCanteens);
    }, []);

    // Handle number click to provide detailed response
    const handleNumberClick = (number) => {
        let detailedResponse = '';
        const key = `${currentContext}_${number}`;
        
        console.log("Handling click for:", key); // Debug log
        
        if (detailedResponses[key]) {
            detailedResponse = detailedResponses[key];
        } else {
            // Fallback to default context if the specific context doesn't have this number
            const defaultKey = `default_${number}`;
            if (detailedResponses[defaultKey]) {
                detailedResponse = detailedResponses[defaultKey];
            } else {
                detailedResponse = `I don't have detailed information about this option in the current context. Please ask about something else.`;
            }
        }
        
        // After showing detailed response, provide options to continue
        if (currentContext !== 'default') {
            detailedResponse += '\n\nWhat else would you like to know? Choose an option:\n1 Menu items\n2 Price information\n3 Food recommendations\n4 Special dishes';
            setCurrentContext('default');
        } else {
            // If we're already in the default context, provide context-specific follow-up options
            if (number === 1) {
                detailedResponse += '\n\nWhich canteen would you like to explore?\n1 Nadhini\n2 Mingos';
                setCurrentContext('menu');
            } else if (number === 2) {
                detailedResponse += '\n\nWould you like to see:\n1 Budget options\n2 Mid-range options\n3 Premium options';
                setCurrentContext('price_range');
            } else if (number === 3) {
                detailedResponse += '\n\nWhat type of food are you interested in?\n1 Vegetarian\n2 Non-vegetarian\n3 Spicy food\n4 Healthy options';
                setCurrentContext('food_type');
            } else if (number === 4) {
                detailedResponse += '\n\nWhen will you be eating?\n1 Breakfast\n2 Lunch\n3 Dinner\n4 Snacks';
                setCurrentContext('meal_time');
            }
        }
        
        setChatHistory(prev => [...prev, {
            role: 'assistant',
            content: detailedResponse
        }]);
    };

    const getFallbackResponse = (userMessage) => {
        const message = userMessage.toLowerCase();
        
        // New context handlers for the follow-up menus
        if (currentContext === 'price_range') {
            if (message.includes('1') || message.includes('budget')) {
                setCurrentContext('budget');
                return `Budget-friendly options under ₹30:\n1 Coffee (₹10)\n2 Tea (₹12)\n3 Biscuits (₹10)\n4 Soda (₹20)\n\nSelect a number to learn more.`;
            } else if (message.includes('2') || message.includes('mid')) {
                setCurrentContext('mid_range');
                return `Mid-range options (₹30-₹80):\n1 Burger (₹50)\n2 Sandwich (₹40)\n3 Dosa (₹60)\n4 Paratha (₹50)\n\nSelect a number to learn more.`;
            } else if (message.includes('3') || message.includes('premium')) {
                setCurrentContext('premium');
                return `Premium options (₹80-₹150):\n1 Full Meals (₹150)\n2 Pizza (₹100)\n3 Thali (₹120)\n4 Special Biryani (₹140)\n\nSelect a number to learn more.`;
            }
        }
        
        if (currentContext === 'food_type') {
            if (message.includes('1') || message.includes('veg')) {
                setCurrentContext('vegetarian');
                return `Great vegetarian options:\n1 Paneer Butter Masala (₹140)\n2 Veg Thali (₹120)\n3 Mixed Veg Curry (₹90)\n\nSelect a number to learn more.`;
            } else if (message.includes('2') || message.includes('non')) {
                setCurrentContext('non_veg');
                return `Delicious non-vegetarian options:\n1 Butter Chicken (₹180)\n2 Chicken Biryani (₹160)\n3 Fish Curry (₹200)\n\nSelect a number to learn more.`;
            } else if (message.includes('3') || message.includes('spicy')) {
                setCurrentContext('spicy');
                return `For spicy food lovers, try:\n1 Andhra Style Chicken (₹160)\n2 Schezwan Noodles (₹100)\n3 Spicy Veg Manchurian (₹90)\n\nSelect a number to learn more.`;
            } else if (message.includes('4') || message.includes('healthy')) {
                setCurrentContext('healthy');
                return `Healthy options:\n1 Sprouts Salad (₹60)\n2 Grilled Sandwich (₹80)\n3 Fruit Bowl (₹70)\n\nSelect a number to learn more.`;
            }
        }
        
        if (currentContext === 'meal_time') {
            if (message.includes('1') || message.includes('breakfast')) {
                setCurrentContext('breakfast');
                return `Best breakfast options:\n1 Idli Sambar (₹40)\n2 Aloo Paratha (₹50)\n3 Poha (₹30)\n\nSelect a number to learn more.`;
            } else if (message.includes('2') || message.includes('lunch')) {
                setCurrentContext('lunch');
                return `Popular lunch options:\n1 Thali (₹120)\n2 Rice and Curry (₹100)\n3 Biryani (₹140)\n\nSelect a number to learn more.`;
            } else if (message.includes('3') || message.includes('dinner')) {
                setCurrentContext('dinner');
                return `Popular dinner choices:\n1 Full Meals (₹150)\n2 Chapati with Curry (₹80)\n3 Mixed Fried Rice (₹110)\n\nSelect a number to learn more.`;
            } else if (message.includes('4') || message.includes('snack')) {
                setCurrentContext('snacks');
                return `Quick snack options:\n1 Samosa (₹15)\n2 Vada (₹12)\n3 Sandwich (₹40)\n\nSelect a number to learn more.`;
            }
        }
        
        // Original context handlers
        // Check for canteen-specific queries
        if (message.includes('nadhini')) {
            setCurrentContext('nadhini');
            const nadhiniItems = cafes.find(c => c.name === 'Nadhini')?.menu || [];
            return `Nadhini Canteen (North Campus) offers:\n1 Coffee (₹10)\n2 Tea (₹12)\n3 Samosa (₹15)\n\nSelect a number to learn more.`;
        }

        if (message.includes('mingos')) {
            setCurrentContext('mingos');
            const mingosItems = cafes.find(c => c.name === 'Mingos')?.menu || [];
            return `Mingos Canteen (South Campus) offers:\n1 Burger (₹50)\n2 Fries (₹30)\n3 Pizza (₹100)\n\nSelect a number to learn more.`;
        }

        // Check for food-related queries
        if (message.includes('food') || message.includes('menu') || message.includes('dishes')) {
            setCurrentContext('menu');
            return `Here are the available canteens:\n1 Nadhini\n2 Mingos\n\nSelect a number to learn more.`;
        }

        // Update existing responses to use hardcoded data
        if (message.includes('price') || message.includes('cheap') || message.includes('budget')) {
            setCurrentContext('budget');
            return `Budget-friendly options under ₹30:\n1 Coffee (₹10)\n2 Tea (₹12)\n3 Biscuits (₹10)\n4 Soda (₹20)\n\nSelect a number to learn more.`;
        }

        // Common food-related keywords
        if (message.includes('recommend') || message.includes('suggestion') || message.includes('what')) {
            setCurrentContext('recommend');
            return `Based on our popular items, I recommend:\n1 Butter Chicken (₹180)\n2 Masala Dosa (₹60)\n3 Veg Biryani (₹120)\n\nSelect a number to learn more.`;
        }
        
        if (message.includes('spicy') || message.includes('hot')) {
            setCurrentContext('spicy');
            return `For spicy food lovers, try:\n1 Andhra Style Chicken (₹160)\n2 Schezwan Noodles (₹100)\n3 Spicy Veg Manchurian (₹90)\n\nSelect a number to learn more.`;
        }

        if (message.includes('vegetarian') || message.includes('veg')) {
            setCurrentContext('vegetarian');
            return `Great vegetarian options:\n1 Paneer Butter Masala (₹140)\n2 Veg Thali (₹120)\n3 Mixed Veg Curry (₹90)\n\nSelect a number to learn more.`;
        }

        if (message.includes('breakfast') || message.includes('morning')) {
            setCurrentContext('breakfast');
            return `Best breakfast options:\n1 Idli Sambar (₹40)\n2 Aloo Paratha (₹50)\n3 Poha (₹30)\n\nSelect a number to learn more.`;
        }

        if (message.includes('dinner') || message.includes('night')) {
            setCurrentContext('dinner');
            return `Popular dinner choices:\n1 Full Meals (₹150)\n2 Chapati with Curry (₹80)\n3 Mixed Fried Rice (₹110)\n\nSelect a number to learn more.`;
        }

        if (message.includes('healthy') || message.includes('diet')) {
            setCurrentContext('healthy');
            return `Healthy options:\n1 Sprouts Salad (₹60)\n2 Grilled Sandwich (₹80)\n3 Fruit Bowl (₹70)\n\nSelect a number to learn more.`;
        }

        // Default response
        setCurrentContext('default');
        return `I can help you with campus food options. Choose a category:\n1 Menu items\n2 Price information\n3 Food recommendations\n4 Special dishes`;
    };

    const handleSend = async () => {
        if (message.trim() === '') return;

        try {
            setIsLoading(true);
            const newMessage = { role: 'user', content: message };
            setChatHistory(prev => [...prev, newMessage]);

            // Check if the message is just a number
            const numberMatch = message.trim().match(/^[1-9]\d*$/);
            if (numberMatch) {
                const number = parseInt(numberMatch[0], 10);
                // Add a small delay to simulate processing
                setTimeout(() => {
                    handleNumberClick(number);
                    setIsLoading(false);
                }, 500);
                setMessage('');
                return;
            }

            try {
                // This would be where you'd call an external API
                // Since we're not using external APIs, we'll use the fallback
                throw new Error('Using fallback response');
            } catch (error) {
                console.error('Chat error:', error);
                const fallbackResponse = getFallbackResponse(message);
                setChatHistory(prev => [...prev, {
                    role: 'assistant',
                    content: fallbackResponse
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const fallbackResponse = getFallbackResponse(message);
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: fallbackResponse
            }]);
        } finally {
            setIsLoading(false);
            setMessage('');
        }
    };

    // Function to make numbers in text clickable
    const renderMessageWithClickableNumbers = (text) => {
        // Regular expression to match numbers at the beginning of a line
        const parts = text.split(/\n/);
        
        return parts.map((part, partIndex) => {
            // Check if the line starts with a number followed by a space
            // This regex matches both "1 " and "1. " and "1) " formats
            const numberMatch = part.match(/^(\d+)(?:[\s\.\)]|\s+)/);
            
            if (numberMatch) {
                const number = parseInt(numberMatch[1], 10);
                // Find where the actual text starts after the number and any formatting
                const textStartIndex = part.indexOf(numberMatch[0]) + numberMatch[0].length;
                const afterNumber = part.substring(textStartIndex);
                
                return (
                    <View key={partIndex} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                        <TouchableOpacity 
                            onPress={() => handleNumberClick(number)}
                            style={styles.numberButton}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.numberButtonText}>
                                {number}
                            </Text>
                        </TouchableOpacity>
                        <Text style={[styles.messageText, styles.assistantText]}>
                            {afterNumber}
                        </Text>
                        {partIndex < parts.length - 1 && <Text style={[styles.messageText, styles.assistantText]}>{'\n'}</Text>}
                    </View>
                );
            } else {
                return (
                    <Text key={partIndex} style={[styles.messageText, styles.assistantText]}>
                        {part}
                        {partIndex < parts.length - 1 && '\n'}
                    </Text>
                );
            }
        });
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#fff',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e5e5',
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginLeft: 16,
        },
        chatContainer: {
            flex: 1,
            padding: 16,
        },
        messageContainer: {
            maxWidth: '80%',
            marginVertical: 8,
            padding: 12,
            borderRadius: 16,
        },
        userMessage: {
            alignSelf: 'flex-end',
            backgroundColor: '#2D6A4F',
        },
        assistantMessage: {
            alignSelf: 'flex-start',
            backgroundColor: '#f5f5f5',
            borderWidth: 1,
            borderColor: '#e0e0e0',
        },
        messageText: {
            fontSize: 16,
            color: '#fff',
        },
        inputContainer: {
            flexDirection: 'row',
            padding: 16,
            backgroundColor: '#fff',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: '#e5e5e5',
        },
        input: {
            flex: 1,
            backgroundColor: '#f0f0f0',
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginRight: 8,
            maxHeight: 100,
        },
        sendButton: {
            backgroundColor: '#2D6A4F',
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
        },
        loadingContainer: {
            padding: 10,
            alignItems: 'center',
        },
        assistantText: {
            color: '#333',
        },
        disabledButton: {
            opacity: 0.5,
        },
        clickableNumber: {
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: '#2D6A4F',
            borderRadius: 15,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginRight: 8,
            overflow: 'hidden',
        },
        numberButton: {
            backgroundColor: '#2D6A4F',
            width: 30,
            height: 30,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
        },
        numberButtonText: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 16,
        },
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Icon.ArrowLeft stroke="#2D6A4F" strokeWidth={3} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Food Assistant</Text>
            </View>

            <ScrollView 
                style={styles.chatContainer}
                ref={ref => {
                    if (ref) {
                        this.scrollView = ref;
                    }
                }}
                onContentSizeChange={() => {
                    if (this.scrollView) {
                        this.scrollView.scrollToEnd({ animated: true });
                    }
                }}
            >
                {chatHistory.map((chat, index) => (
                    <View
                        key={index}
                        style={[
                            styles.messageContainer,
                            chat.role === 'user' ? styles.userMessage : styles.assistantMessage
                        ]}
                    >
                        {chat.role === 'assistant' ? (
                            renderMessageWithClickableNumbers(chat.content)
                        ) : (
                            <Text style={styles.messageText}>
                                {chat.content}
                            </Text>
                        )}
                    </View>
                ))}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#2D6A4F" />
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Type your message..."
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Icon.Send height="24" width="24" stroke="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
} 