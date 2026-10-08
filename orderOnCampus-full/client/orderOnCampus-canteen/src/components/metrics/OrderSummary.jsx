import { Chart as ChartJS, ArcElement, Legend, Tooltip } from "chart.js";
import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import axios from "axios";
import { useLocation } from 'react-router-dom';

ChartJS.register(ArcElement, Tooltip, Legend);
function OrderSummary({ userData }) {
  const location = useLocation();
  const [mostOrderedItems, setMostOrderedItems] = useState([]);

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
            `http://localhost:5001/most-ordered-item/${canteenId}`
          ); 
          setMostOrderedItems(response.data.data);          
        } catch (error) {
          console.error("Error fetching most ordered items:", error);
        }
      }
    };

    fetchMostOrderedItems();
  }, [location]);

  // Dummy data for the most ordered items in the menu
  // const mostOrderedItems = [
  //   { name: "Item A", quantity: 50 },
  //   { name: "Item B", quantity: 30 },
  //   { name: "Item C", quantity: 20 },
  //   { name: "Item D", quantity: 15 },
  //   { name: "Item E", quantity: 10 },
  // ];

  // Extracting labels and data from the dummy data
  const labels = mostOrderedItems.map((item) => item.name);
  const data = mostOrderedItems.map((item) => item.quantity);

  return (
    <div className="flex items-center justify-center h-80 p-2">
      <Doughnut className="text-left flex flex-col"
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
                "#98FB98",
              ],
            },
          ],
        }}
        options={{
          plugins: {
            title: {
              display: false,
              text: "Most Ordered Items",
            },
          },
          legend: {
            display: true,
            position: "right", // Arrange legend on the right side
          },
          cutout: 70, // Adjust the cutout value to control the size of the hole in the center
        }}
      />
    </div>
  );
}

export default OrderSummary;
