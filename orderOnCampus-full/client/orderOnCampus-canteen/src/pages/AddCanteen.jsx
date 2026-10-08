import React, { useState } from "react";
import GettingStarted from "../components/landing/gettingStarted";
import LoginForm from "../components/landing/LoginForm";
import RegisterForm from "../components/landing/RegisterForm";
import "./addCanteen.css";

function AddCanteen() {
  
  const [loginActive, setLoginActive] = useState(false);
  const [regActive, setReginActive] = useState(false);

  const logIn = () => {
    setLoginActive(true);
  };
  const register = () => {
    setReginActive(true);
  };
  return (
    <>
      <div className="main text-white py-14 px-52 items-center justify-between content-center">
        <h1 className="text-4xl text-[#00FF00] font-bold text-center py-6 mb-20">
        Campus Rush: Order Now, Eat Soon!
        </h1>
        <div className="flex gap-5">
          <div
            className="bg-white text-center rounded-lg p-3 cursor-pointer px-10"
            style={{ width: "50%" }}
            onClick={logIn}
          >
            <button className="text-green-950">
              Login to your existing canteen
            </button>
          </div>
          <div
            className="bg-green-950 text-center rounded-lg p-3 cursor-pointer px-10"
            style={{ width: "50%" }}
            onClick={register}
          >
            <button className="text-white">Register your Canteen</button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center content-center">
        <GettingStarted />
      </div>
      <LoginForm loginActive={loginActive} setLoginActive={setLoginActive} />
      <RegisterForm regActive={regActive} setReginActive={setReginActive} />
    </>
  );
}

export default AddCanteen;
