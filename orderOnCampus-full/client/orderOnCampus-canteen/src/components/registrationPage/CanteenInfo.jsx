import React, { useState } from "react";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

function CanteenInfo({
  setCanteenName,
  setLoc,
  setDesc,
  setCategory,
  canteenName,
  location,
  category,
  canteenNameVerify,
  setCanteenNameVerify,
  locationVerify,
  setLocVerify,
  categoryVerify,
  setCategoryVerify,
}) {
  const handleCanteenName = (e) => {
    const nameVar = e.target.value;
    setCanteenName(nameVar);
    setCanteenNameVerify(false);
    const regex = /^[a-zA-Z\s]{3,}$/;
    if (regex.test(nameVar)) {
      setCanteenNameVerify(true);
    }
  };
  const handleCanteenLoc = (e) => {
    const locVar = e.target.value;
    console.log("locVAr", locVar);
    setLoc(locVar);
    console.log(location);
    setLocVerify(false);
    const regex = /^[a-zA-Z\s]{3,}$/;
    if (regex.test(locVar)) {
      setLocVerify(true);
    }
  };
  const handleCanteenCategory = (e) => {
    const catVar = e.target.value;
    console.log("catVar", catVar);
    setCategory(catVar);
    console.log(category);
    setCategoryVerify(false);
    if (catVar.length > 0) {
      setCategoryVerify(true);
    }
  };

  return (
    <div className="h-fit mx-10  rounded-lg bg-white p-5">
      <h4 className="text-green-900 justify-center font-semibold text-left">
        Create Your Canteen Page
      </h4>
      <div className="flex flex-col my-5 py-5 space-y-5 px-20 rounded-md">
        <h6 className="text-green-950">Canteen Information</h6>
        <div className="flex items-center  w-full border border-green-950 rounded-md">
          <input
            type="text"
            placeholder="Canteen Name"
            className="py-3 px-2 rounded-md  w-full outline-none"
            onChange={(e) => handleCanteenName(e)}
          />
          {canteenName.length < 1 ? null : canteenNameVerify ? (
            <FaCheckCircle className="m-2 text-green-900" />
          ) : (
            <FaTimesCircle className="m-2 text-red-700 " />
          )}
        </div>
        {canteenName.length < 1 ? null : canteenNameVerify ? null : (
          <p className="font-light text-sm text-red-700">
            name should be more than 2 characters and only contain letters
          </p>
        )}
        <div className="flex items-center  w-full border border-green-950 rounded-md">
          <input
            type="text"
            placeholder="Canteen Location (Basement Central Block)"
            className="py-3 px-2 rounded-md  w-full outline-none"
            onChange={(e) => handleCanteenLoc(e)}
          />
          {location.length < 1 ? null : locationVerify ? (
            <FaCheckCircle className="m-2 text-green-900" />
          ) : (
            <FaTimesCircle className="m-2 text-red-700 " />
          )}
        </div>
        {location.length < 1 ? null : locationVerify ? null : (
          <p className="font-light text-sm text-red-700">
            Location should be more than 2 characters and only contain letters
          </p>
        )}
        <textarea
          id="description"
          placeholder="Description(Optional)"
          className="w-full px-3 py-2 border border-green-950 rounded-md focus:outline-none focus:ring focus:border-green-900 outline-0"
          rows="3"
          onChange={(e) => setDesc(e.target.value)}
        ></textarea>
        <div className="flex items-center rounded-md border border-green-950 h-12">
          <select
            className="py-3 px-2 w-full bg-white rounded-md h-full outline-none overflow-visible"
            onChange={(e) => handleCanteenCategory(e)}
          >
            <option value="">Select Category</option>
            <option value="All">All</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Snacks">Snacks</option>
          </select>
          {category.length < 1 ? null : categoryVerify ? (
            <FaCheckCircle className="m-2 text-green-900" />
          ) : (
            <FaTimesCircle className="m-2 text-red-700 " />
          )}
        </div>
        {category.length < 1 ? null : categoryVerify ? null : (
          <p className="font-light text-sm text-red-700">
            please select a category
          </p>
        )}
        {/* <input
          type="number"
          placeholder="Contact Number"
          className="py-3 px-2 rounded-md border border-green-950"
        /> */}
        <input
          type="Text"
          placeholder="Image url"
          className="py-3 px-2 rounded-md border border-green-950"
          // onChange={(e)=>setCanteenName(e.target.value)}
        />
      </div>
      <br />
    </div>
  );
}

export default CanteenInfo;
