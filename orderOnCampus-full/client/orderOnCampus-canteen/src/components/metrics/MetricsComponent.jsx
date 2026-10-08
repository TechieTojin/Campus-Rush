import React, { useEffect, useState } from "react";
import OrderSummary from "./OrderSummary";
import OrderStats from "./OrderStats";
import { useDispatch, useSelector } from "react-redux";
import { selectUserData } from "../../slices/authSlice";
import axios from "axios";

function MetricsComponent() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [uniqueCustomers, setUniqueCustomers] = useState(0);
  const userData = useSelector(selectUserData);

  useEffect(() => {
    // Define the function inside useEffect
    const getCanteenOrders = async () => {
      if (
        userData &&
        userData.ownedCanteens &&
        userData.ownedCanteens.length > 0
      ) {
        try {
          const canteenId = userData.ownedCanteens[0]._id;
          const res = await axios.get(
            `http://localhost:5001/canteens/${userData.ownedCanteens[0]._id}/get-canteen`
          );
          setOrders(res.data.data.orders);
          setMenu(res.data.data.menu);          
          const customerRes = await axios.get(
            `http://localhost:5001/canteens/${canteenId}/unique-customers`
          );
          setUniqueCustomers(customerRes.data.count);
        } catch (err) {
          console.error("Failed to fetch canteen orders:", err);
        }
      }
    };

    // Call the function
    getCanteenOrders();
  }, [userData]);

  return (
    <div className="flex flex-col gap-5 px-28 py-20 m-x-20 w-full lg:flex lg:flex-col">
      <div className="grid grid-cols-1 gap-4 w-full lg:grid-cols-3">
        <div className="h-52 w-full rounded-lg bg-white lg:col-span-1">
          <p className="p-5 font-bold text-green-900 ">Total Menu</p>
          <div
            className="p-5 flex items-center justify-center
           w-full h-24"
          >
            <p className="font-bold text-5xl text-green-900">{menu.length}</p>
          </div>
        </div>
        <div className="h-52 w-full rounded-lg bg-white lg:col-span-1">
          <p className="p-5 font-bold text-green-900">Total Orders</p>
          <div
            className="p-5 flex items-center justify-center
           w-full h-24"
          >
            <p className="font-bold text-5xl text-green-900">{orders.length}</p>
          </div>
        </div>
        <div className="h-52 w-full rounded-lg bg-white lg:col-span-1">
          <p className="p-5 font-bold text-green-900">Total Customers</p>
          <div
            className="p-5 flex items-center justify-center
           w-full h-24"
          >
            <p className="font-bold text-5xl text-green-900">
              {uniqueCustomers}
            </p>
          </div>
        </div>
      </div>
      <div className="grid w-full gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="flex flex-col h-96 w-full rounded-lg bg-white">
          <p className="p-5 font-bold text-green-900">Popular Order</p>
          <OrderSummary userData={userData}/>
        </div>
        <div className="flex flex-col h-fit w-full rounded-lg bg-white">
          <p className="p-5 font-bold text-green-900">Popular Time</p>
          <OrderStats userData={userData} />
        </div>
      </div>
    </div>
  );
}

export default MetricsComponent;
