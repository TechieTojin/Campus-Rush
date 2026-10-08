import axios from "axios";
import React, { useEffect, useState } from "react";

function OrderItem({ item }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const getMenuItem = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/canteens/${item}/get-item`);
      setName(res.data.data.name);
      setPrice(res.data.data.price);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getMenuItem();
  }, [item]);
  return (
    <div className="flex items-center justify-between p-5 border border-gray-200">
      <div className="flex flex-col">
        <p className="text-green-900">{name}</p>
        <p className="text-gray-500 font-light">desserts</p>
      </div>
      <div>
        <p className="text-black font-semibold">₹{price}</p>
      </div>
    </div>
  );
}

export default OrderItem;
