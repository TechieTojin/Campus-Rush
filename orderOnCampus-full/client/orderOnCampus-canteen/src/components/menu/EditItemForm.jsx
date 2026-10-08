import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import axios from "axios";
function EditItemForm({ editForm, setEditForm , id, editRerender}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [avialable, setAvialable] = useState(true);
  const [nameVerify, setNameVerify] = useState(false);
  const [priceVerify, setPriceVerify] = useState(false);

  const handleName = (e) => {
    const nameVar = e.target.value;
    setName(nameVar);
    setNameVerify(false);
    const regex = /^[a-zA-Z\s]{3,}$/;
    if (regex.test(nameVar)) {
      setNameVerify(true);
    }
  };

  const handlePrice = (e) => {
    const priceVar = Number(e.target.value);
    setPrice(priceVar);
    setPriceVerify(false);
    const regex = /^\d+(\.\d+)?$/;
    if (priceVar > 0) {
      setPriceVerify(true);
    }
  };

  const handleSubmit = async(e) => {
    if (!nameVerify || !priceVerify || !avialable) {
      alert("Fill all the mandatory fields");
    }
    e.preventDefault();
    const data = {
      name,
      description,
      price,
      avialable,
    };
    await axios.put(`http://localhost:5001/menu/${id}`,data).then((res)=>{
      setEditForm(false);
      // handleDelete()
      editRerender()
    }).catch((err) => {
        console.error(err);
        alert("Failed to edit new item");
      });
  };

  if (!editForm) return null;
  return (
    <div className="fixed w-full inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center content-center z-50">
      <div className="lg:w-1/2 mx-auto p-6 bg-gray-100 shadow-md rounded-md">
        <div className="flex items-center justify-between mb-10">
          <h4 className="text-gray-500 text-2xl ">Edit Dish</h4>
          <FontAwesomeIcon
            icon={faXmark}
            onClick={() => {
              setEditForm(false);
              setNameVerify(false);
              setPriceVerify(false);
            }}
            className="h-5"
            color="gray"
          />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block font-medium mb-1">
              Name
            </label>
            <div className="flex items-center border w-full bg-white  rounded-md">
              <input
                type="text"
                id="name"
                name="name"
                onChange={handleName}
                className="w-full px-3 py-2  rounded-md focus:outline-none "
              />
              {name.length < 1 ? null : nameVerify ? (
                <FaCheckCircle className="m-2 text-green-900" />
              ) : (
                <FaTimesCircle className="m-2 text-red-700 " />
              )}
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-green-900"
              rows="3"
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="price" className="block font-medium mb-1">
              Price
            </label>
            <div className="flex items-center border w-full  bg-white rounded-md">
              <input
                type="number"
                id="price"
                name="price"
                onChange={handlePrice}
                className="w-full px-3 py-2  rounded-md focus:outline-none "
              />
              {price.length < 1 ? null : priceVerify ? (
                <FaCheckCircle className="m-2 text-green-900" />
              ) : (
                <FaTimesCircle className="m-2 text-red-700 " />
              )}
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="image" className="block font-medium mb-1">
              Image URL
            </label>
            <input
              type="text"
              id="image"
              name="image"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-green-900"
            />
          </div>
          <button
            type="submit"
            className="bg-green-900 text-white px-4 py-2 rounded-md hover:bg-green-950 transition-colors duration-300"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditItemForm;
