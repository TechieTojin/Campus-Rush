import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import CanteenCard from './CanteenCard';
// import { allCanteens } from '../constants';
import axios from 'axios';
import { useCallback } from 'react';
import * as Icon from "react-native-feather";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { API_URL } from '../config/api';


export default function CanteenSlide({ activeCategory, filteredData }) {
  const [allCanteens, setAllCanteens] = useState([])
  const [renderCount, setRenderCount] = useState(0);
  const windowHeight = Dimensions.get('window').height;
  
  const allCategory = allCanteens.filter(canteen => canteen.categories && canteen.categories.includes('all'));
  const breakfast = allCanteens.filter(canteen => canteen.categories && canteen.categories.includes('breakfast'));
  const lunch = allCanteens.filter(canteen => canteen.categories && canteen.categories.includes('lunch'));
  const snacks = allCanteens.filter(canteen => canteen.categories && canteen.categories.includes('snacks'));

  const getCanteens = useCallback(async () => {
    await axios.get(`${API_URL}/canteens/get-canteens`)
      .then((res) => {
        setAllCanteens(res.data.data);
        console.log("CANTEEN SLIDE",allCanteens)
        setRenderCount(renderCount + 1);
      })
      .catch(err => console.log(err))
  },[])

  useEffect(() => {
    getCanteens();
    const intervalId = setInterval(() => {
      getCanteens();
    }, 20000);
    return () => clearInterval(intervalId);
  },[]); 
  
  let renderedCategory;
  let Category;
  if (activeCategory === 1) {
    Category = "Campus Canteens"
    renderedCategory = [allCategory].map((canteen, index) => {
      return (
        <CanteenCard key={index} canteen={canteen}  />
      )
    })
  } else if (activeCategory === 2) {
    Category = "Breakfast"
    renderedCategory = [breakfast].map((canteen, index) => {
      return (
        <CanteenCard key={index} canteen={canteen} />
      )
    })
  } else if (activeCategory === 3) {
    Category = "Lunch"
    renderedCategory = [lunch].map((canteen, index) => {
      return (
        <CanteenCard key={index}  canteen={canteen}/>
      )
    })
  } else if (activeCategory === 4) {
    Category = "Snacks"
    renderedCategory = [snacks].map((canteen, index) => {
      return (
        <CanteenCard key={index}  canteen={canteen}/>
      )
    })
  } else {
    if (allCanteens.length > 0) {
      if(filteredData.length > 0){
        Category = "Campus Canteens"
        renderedCategory = [filteredData].map((canteen, index) => {
          return (
            <CanteenCard key={index} canteen={canteen} />
          )
        })
      }else{
        Category = "Campus Canteens"
        renderedCategory = [allCanteens].map((canteen, index) => {
          return (
            <CanteenCard key={index} canteen={canteen} />
          )
        })
      }
    } else {
      Category = "Campus Canteens"
      renderedCategory = (
        <View className="flex-1 items-center justify-center content-center">
          <Icon.EyeOff stroke='gray' width={wp('100%')} height={wp('80%')} />
          <Text className="text-lg text-gray-400">No results </Text>
        </View>
      );
    }
  }

  return (
    <>
      <View>
        <View>
          <Text className="text-xl text-left font-bold text-black-700 pb-5 pt-10 ">
            {Category}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="overflow-visible "
          >
            <View className="flex-row items-center justify-center"
              style={{ marginBottom: hp('2%') }}>
              {renderedCategory}
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  )
}

