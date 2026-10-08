import React from "react";
import { FaCheckCircle } from "react-icons/fa";
function GettingStarted() {
  return (
    <div className="bg-white shadow-2xl rounded-lg px-10 -mt-10 ">
      <h1 className="text-2xl text-[#FFD700] font-bold text-center pt-6">
        Developed by Tojin Simson & Jaiby Joseph 
      </h1>
      <h1 className="text-2xl text-black font-bold text-center pt-6">
        Get started with online ordering
      </h1>
      <h4 className="text-md text-gray-500  text-center ">
        Please keep the documents ready for a smooth signup
      </h4>
      <div className="flex items-center content-center justify-center gap-5 p-5 ">
        <div className="space-y-10">
          <h6 className="flex items-center gap-2">
            <FaCheckCircle color="green" /> FSSAI license copy
          </h6>
          <h6 className="flex items-center gap-2">
            {" "}
            <FaCheckCircle color="green" />
            Regular GSTIN (if applicable)
          </h6>
          <h6 className="flex items-center gap-2">
            {" "}
            <FaCheckCircle color="green" />
            Your restaurant menu
          </h6>
        </div>
        <div className="space-y-10">
          <h6 className="flex items-center gap-2">
            {" "}
            <FaCheckCircle color="green" />
            PAN card copy
          </h6>
          <h6 className="flex items-center gap-2">
            {" "}
            <FaCheckCircle color="green" />
            Bank account details
          </h6>
          <h6 className="flex items-center gap-2">
            {" "}
            <FaCheckCircle color="green" />
            Dish images for top 5 items
          </h6>
        </div>
      </div>
    </div>
  );
}

export default GettingStarted;
