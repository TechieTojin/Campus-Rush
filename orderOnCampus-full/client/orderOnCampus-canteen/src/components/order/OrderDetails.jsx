import React, { useState } from "react";
import OrderItem from "./OrderItem";
import axios from "axios";

function OrderDetails({ order, triggerRender }) {
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  const dateString = order.timestamp;
  const date = new Date(dateString);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const changeStatus = async (newStatus) => {
    if (updating) return;
    setUpdating(true);
    setMessage(null);
    try {
      await axios.put(`http://localhost:5001/orders/${order._id}/status`, {
        status: newStatus,
      }, { withCredentials: true });
      setMessage({ type: "success", text: `Order moved to ${newStatus}` });
      triggerRender();
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to update status";
      setMessage({ type: "error", text: errMsg });
    } finally {
      setUpdating(false);
    }
  };

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear().toString().slice(-2);

  const formattedDate = `${day} ${months[monthIndex]} ${year}`;

  const renderButtons = () => {
    switch (order.status) {
      case "Placed":
        return (
          <>
            <button
              onClick={() => changeStatus("Cancelled")}
              disabled={updating}
              className="py-2 px-5 lg:px-28 rounded-lg bg-white border border-green-900 text-green-900 disabled:opacity-50"
            >
              Reject Order
            </button>
            <button
              onClick={() => changeStatus("Processing")}
              disabled={updating}
              className="py-2 px-5 lg:px-28 rounded-lg bg-green-900 text-white disabled:opacity-50"
            >
              Start Preparing
            </button>
          </>
        );
      case "Processing":
        return (
          <>
            <button
              onClick={() => changeStatus("Ready")}
              disabled={updating}
              className="py-2 px-5 lg:px-28 rounded-lg bg-white border border-green-900 text-green-900 disabled:opacity-50"
            >
              Order Ready
            </button>
            <button
              onClick={() => changeStatus("Completed")}
              disabled={updating}
              className="py-2 px-5 lg:px-28 rounded-lg bg-green-900 text-white disabled:opacity-50"
            >
              Order Delivered
            </button>
          </>
        );
      case "Ready":
        return (
          <button
            onClick={() => changeStatus("Completed")}
            disabled={updating}
            className="py-2 px-5 lg:px-56 rounded-lg bg-green-900 text-white disabled:opacity-50"
          >
            Order Delivered
          </button>
        );
      default:
        return (
          <p className="text-gray-500 font-light">
            Order {order.status.toLowerCase()}
          </p>
        );
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-5 bg-gray-300">
        <p className="text-green-900">#{order._id}</p>
        <p className="text-gray-500 font-light">{formattedDate}</p>
        <p className="text-gray-500 font-light">
          {order.items.length} items for {order.totalPrice}
        </p>
      </div>
      <div className="flex flex-col gap-y-5 mt-5">
        {order.items.map((item, key) => (
          <OrderItem key={key} item={item} />
        ))}
      </div>
      {message && (
        <p className={`text-center py-2 ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
      <div className="flex justify-evenly items-center p-5">
        {renderButtons()}
      </div>
    </div>
  );
}

export default OrderDetails;
