import axios from "axios";
import React, { useEffect, useState } from "react";

function OrderList({ item, getOrder }) {
  console.log("oredr list", item);
  const [userId, setUserID] = useState("");
  const [user, setUser] = useState("");
  const timestamp = item.timestamp;

  // Convert the timestamp string to a Date object
  const date = new Date(timestamp);

  // Extract date components
  const year = date.getFullYear();
  const month = date.getMonth() + 1; 
  const day = date.getDate();

  // Extract time components
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  console.log("ORDER LIST",item);
  const getData = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5001/users/${userId}/get-user`
      );
      setUser(res.data.data.name);
      getOrder()
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (item && item.user) {
      setUserID(item.user);
    }
  }, [item]);

  useEffect(() => {
    if (userId.length > 0) {
      getData();
    }
  }, [userId]);

  return (
    <div className="flex flex-col w-full items-start gap-2 p-5 shadow-lg rounded mt-2 hover:shadow-md hover:shadow-green-900">
      <div className="flex flex-row items-center justify-between w-full">
        <h6 className="text-gray-600">{user.toUpperCase()}</h6>
        <h6 className="text-green-900">{item.status.toUpperCase()}</h6>
      </div>
      <h6 className="text-green-900 font-semibold">
        {hours}:{minutes >= 10 ? `${minutes}` : `0${minutes}`}
      </h6>
      <p className="text-sm font-light">
        {item.items.length} items for ₹{item.totalPrice}
      </p>
    </div>
  );
}

export default OrderList;
