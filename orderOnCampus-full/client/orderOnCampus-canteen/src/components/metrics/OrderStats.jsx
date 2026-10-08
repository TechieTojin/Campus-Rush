import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, LinearScale } from "chart.js/auto";
import { useLocation } from "react-router-dom";
import axios from "axios";

Chart.register(ArcElement, Tooltip, LinearScale);

function OrderStats({ userData }) {
  const location = useLocation();
  const [popularTimes, setPopularTimes] = useState([]);

  useEffect(() => {
    // Fetch most ordered items data from the backend
    const fetchMostOrderedItems = async () => {
      if (
        userData &&
        userData.ownedCanteens &&
        userData.ownedCanteens.length > 0
      ) {
        try {
          const canteenId = userData.ownedCanteens[0]._id;
          const response = await axios.get(
            `http://localhost:5001/canteens/${canteenId}/get-canteen`
          );
          const orders = response.data.data.orders;

          // Group orders by time periods
          const groupedOrders = groupOrdersByTimePeriods(orders);

          // Update state with grouped orders
          setPopularTimes(groupedOrders);
        } catch (error) {
          console.error("Error fetching most ordered items:", error);
        }
      }
    };

    fetchMostOrderedItems();
  }, [location, userData]);

  // Function to group orders by time periods
  const groupOrdersByTimePeriods = (orders) => {
    // Define time periods
    const timePeriods = ["Morning", "Afternoon", "Evening", "Night"];

    // Initialize object to store counts for each time period
    const timePeriodCounts = {
      Morning: 0,
      Afternoon: 0,
      Evening: 0,
      Night: 0,
    };

    // Loop through orders and count orders for each time period
    orders.forEach((order) => {
      const timestamp = new Date(order.timestamp);
      const hour = timestamp.getHours();

      if (hour >= 6 && hour < 12) {
        timePeriodCounts.Morning++;
      } else if (hour >= 12 && hour < 16) {
        timePeriodCounts.Afternoon++;
      } else if (hour >= 16 && hour < 19) {
        timePeriodCounts.Evening++;
      } else {
        timePeriodCounts.Night++;
      }
    });

    // Convert counts object to array of { time, orders } objects
    const groupedOrders = timePeriods.map((timePeriod) => ({
      time: timePeriod,
      orders: timePeriodCounts[timePeriod],
    }));

    return groupedOrders;
  };

  // Extracting labels and data from the grouped orders
  const labels = popularTimes.map((time) => time.time);
  const data = popularTimes.map((time) => time.orders);

  return (
    <div className="flex items-center justify-center h-80 p-2">
      <Bar className="text-left flex flex-col"
        data={{
          labels: labels,
          datasets: [
            {
              label: "Quantity",
              data: data,
              backgroundColor: [
                "#006400", // Dark green
                "#228B22", // Forest green
                "#3CB371", // Medium sea green
                "#90EE90", // Light green
              ],
            },
          ],
        }}
        options={{
          plugins: {
            title: {
              display: false,
              text: "Popular Times",
            },
          },
          scales: {
            y: {
              display: false,
            },
            x: {
              title: {
                display: true,
                text: "Time of Day",
              },
              grid: {
                display: false, // Hide x-axis grid lines
              },
            },
          },
          legend: {
            display: false, // Hide legends
          },
          elements: {
            bar: {
              borderWidth: 0, // Remove the border line
              borderRadius: 25, // Adjust the border radius to round the top of the bars
              barThickness: 20, // Adjust the width of the bars (in pixels)
            },
          },
        }}
      />
    </div>
  );
}

export default OrderStats;
