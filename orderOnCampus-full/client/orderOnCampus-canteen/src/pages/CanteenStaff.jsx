import React, { useEffect, useState } from "react";
import SideNavBar from "../components/sidebar/SideNavBar";
import Header from "../components/header/Header";
import OrderComponent from "../components/order/OrderComponent";
import { Route, Routes, useNavigate } from "react-router-dom";
import MenuComponent from "../components/menu/MenuComponent";
import MetricsComponent from "../components/metrics/MetricsComponent";
import ProfileComponent from "../components/profile/ProfileComponent";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../slices/authSlice";

function CanteenStaff() {
  const navigation = useNavigate();
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  axios.defaults.withCredentials = true;

  const getData = async () => {
    await axios
      .get("http://localhost:5001/staff/auth")
      .then((res) => {
        setUser(res.data.data);
        dispatch(setUserData(res.data.data));
        // console.log(res.data.data)
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    getData();
  }, [dispatch]);

  return (
    <div>
      {/* {user ? ( */}
        <div className="h-screen bg-gray-300 lg:fixed w-full">
          <Header />
          <div className="flex">
            <SideNavBar />
            <Routes>
              <Route
                path="/"
                element={<OrderComponent user={user} />}
              />
              <Route path="/menu" element={<MenuComponent />} />
              <Route path="/metrics" element={<MetricsComponent />} />
              <Route path="/profile" element={<ProfileComponent />} />
            </Routes>
          </div>
        </div>
      {/* // ) : (
      //   <div className="flex flex-1 justify-center items-center h-screen">
      //     <p className="text-xl font-green-900">please log in</p>
      //   </div>
      // )} */}
    </div>
  );
}

export default CanteenStaff;
