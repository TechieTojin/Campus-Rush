import React, { useState, useCallback } from "react";
import EditItemForm from "./EditItemForm";
import { alpha, styled } from "@mui/material/styles";
import { green } from "@mui/material/colors";
import Switch from "@mui/material/Switch";
import axios from "axios";

const GreenSwitch = styled(Switch)(({ theme }) => ({
  "& .MuiSwitch-switchBase.Mui-checked": {
    color: green[900],
    "&:hover": {
      backgroundColor: alpha(green[600], theme.palette.action.hoverOpacity),
    },
  },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: green[600],
  },
}));

const label = { inputProps: { "aria-label": "Color switch demo" } };

function MenuItem({ menuItem, handleDelete }) {
  const [editForm, setEditForm] = useState(false);
  const [id, setId] = useState("");
  const [stock, setStock] = useState(menuItem.available);

  const editItem = () => {
    setEditForm(true);
    setId(menuItem._id);
  };

  const deleteItem = async () => {
    try {
      await axios.delete(`http://localhost:5001/menu/delete/${menuItem._id}`);
      handleDelete();
    } catch (err) {
      console.log(err);
    }
  };

  const editRerender = useCallback(() => {
    handleDelete();
  }, [handleDelete]);

  const handleStock = async () => {
    setStock(!stock);
    try {
      await axios.put(`http://localhost:5001/menu/availability/${menuItem._id}`, { available: !stock });
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-2 border border-gray-200 max-h-20 min-h-20 lg:max-h-20 lg:min-h-20">
        <div className="flex flex-col min-w-[20vh] lg:min-w-[30vh]">
          <p className="text-green-900">{menuItem.name}</p>
          <p className="text-gray-500 font-light">{menuItem.description}</p>
          <p className="text-black font-light">₹{menuItem.price}</p>
        </div>
        <div className="flex items-center">
          <GreenSwitch
            {...label}
            defaultChecked={stock}
            onChange={handleStock}
          />
        </div>
        <div className="flex items-center justify-evenly gap-5">
          <button
            onClick={editItem}
            className="px-5 py-2 bg-green-900 text-white rounded-md hover:bg-white hover:text-black hover:border hover:border-black"
          >
            edit
          </button>
          <button
            onClick={deleteItem}
            className="px-5 py-2 bg-green-900 text-white rounded-md hover:bg-white hover:text-black hover:border hover:border-black"
          >
            delete
          </button>
        </div>
      </div>
      <EditItemForm editRerender={editRerender} editForm={editForm} id={id} setEditForm={setEditForm} />
    </>
  );
}

export default MenuItem;
