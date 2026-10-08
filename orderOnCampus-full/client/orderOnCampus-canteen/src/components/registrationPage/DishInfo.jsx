import React, { useState } from "react";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

function DishInfo({
  setDishName,
  setDishDesc,
  setPrice,
  price,
  dishName,
  dishNameVerify,
  setDishNameVerify,
  priceVerify,
  setPriceVerify
}) {


  const handleDishName = (e) => {
    const nameVar = e.target.value;
    setDishName(nameVar);
    setDishNameVerify(false);
    const regex = /^[a-zA-Z\s]{3,}$/;
    if (regex.test(nameVar)) {
      setDishNameVerify(true);
    }
  };
  const handlePrice = (e) => {
    const priceVar = Number(e.target.value);
    setPrice(priceVar);
    setPriceVerify(false);
    const regex = /^\d+(\.\d+)?$/;
    if (priceVar) {
      setPriceVerify(true);
    }
  };

  return (
    <div className="h-fit mx-10  rounded-lg bg-white p-5">
      <div className="flex flex-col my-5 py-5 space-y-5 px-20 rounded-md">
        <h6 className="text-green-950">Dish Information</h6>
        <div className="flex items-center  w-full border border-green-950 rounded-md">
          <input
            type="text"
            placeholder="Dish Name"
            className="py-3 px-2 rounded-md w-full outline-none"
            onChange={(e) => handleDishName(e)}
          />
          {dishName.length < 1 ? null : dishNameVerify ? (
            <FaCheckCircle className="m-2 text-green-900" />
          ) : (
            <FaTimesCircle className="m-2 text-red-700 " />
          )}
        </div>
        {dishName.length < 1 ? null : dishNameVerify ? null : (
          <p className="font-light text-sm text-red-700">
            Dishn name should be more than 2 characters and all letters
          </p>
        )}
        <textarea
          id="description"
          placeholder="Description(Optional)"
          className="w-full px-3 py-2 border border-green-950 rounded-md focus:outline-none focus:ring focus:border-green-900"
          rows="3"
          onChange={(e) => setDishDesc(e.target.value)}
        ></textarea>
        {/* <select className="py-3 px-2 rounded-md border border-green-950 h-10">
          <option value="">Category</option>
          <option value="ALL">All</option>
          <option value="BR">Breakfast</option>
          <option value="LN">Lunch</option>
          <option value="SN">Snacks</option>
        </select> */}
        <div className="flex items-center  w-full border border-green-950 rounded-md">
          <input
            type="number"
            placeholder="Price"
            className="py-3 px-2 rounded-md w-full"
            onChange={(e) => handlePrice(e)}
          />
          {price < 9 ? null : priceVerify ? (
            <FaCheckCircle className="m-2 text-green-900" />
          ) : (
            <FaTimesCircle className="m-2 text-red-700 " />
          )}
        </div>
        {price < 9 ? null : priceVerify ? null : (
          <p className="font-light text-sm text-red-700">
            please enter the price least amount 10
          </p>
        )}
        <input
          type="Text"
          placeholder="Image url"
          className="py-3 px-2 rounded-md border border-green-950"
          // onChange={(e)}
        />
      </div>
      <br />
    </div>
  );
}

export default DishInfo;
