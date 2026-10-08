import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";
import {
  FaApple,
  FaCheckCircle,
  FaGoogle,
  FaTimesCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

  axios.defaults.withCredentials=true;
function LoginForm({ loginActive, setLoginActive }) {
  axios.defaults.withCredentials=true;
  
  const [email, setEmail] = useState("");
  const [emailVerify, setEmailVerify] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordVerify, setPasswordVerify] = useState(false);

  const [invalidUser, setInvalidUser] = useState(false);
  const [incorrectPassword, setIncorrectPassword] = useState(false);

  const navigation = useNavigate();

  const handleEmail = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailVerify(false);
    const regex = /^[\w\.-]+@[a-zA-Z\d\.-]+\.[a-zA-Z]{2,}$/;
    if (regex.test(value)) {
      setEmailVerify(true);
    }
  };

  const handlePassword = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordVerify(false);
    if (value.length > 0) {
      setPasswordVerify(true);
    }
  };

  const handleForm = (e) => {
    e.preventDefault();
    if (!emailVerify || !passwordVerify) {
      alert("Please check your email and password");
      return;
    } else {
      const data = {
        email: email,
        password,
      };
      axios
        .post("http://localhost:5001/staff/login", data)
        .then((res) => {
          setInvalidUser(false);
          setIncorrectPassword(false);
          if (res.data === "Success") {
            navigation("/canteenStaff");
          } else if (res.data === "Incorrect password") {
            setIncorrectPassword(true);
            setPassword("");
            // alert("Wrong Password!");
          } else if (res.data === "No user found") {
            setEmail("");
            setInvalidUser(true);
            // alert("No user found with this email id");
          } else {
            alert("An error occurred. Please try again later.");
            setEmail("");
            setPassword("");
          }
        })
        .catch((error) => {
          console.log(error);
          alert("An error occurred. Please try again later.");
        });
    }
  };

  if (!loginActive) {
    return null;
  }
  return (
    <div className="fixed w-full inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white p-5 rounded-lg">
        <div className="flex items-center justify-between mb-10">
          <h4 className="text-gray-500 text-2xl ">Login</h4>
          <FontAwesomeIcon
            onClick={() => setLoginActive(false)}
            icon={faXmark}
            className="h-5"
            color="gray"
          />
        </div>
        <div className="flex items-center  justify-center w-full">
          <form onSubmit={handleForm} method="post" className="space-y-5">
            <div className="flex items-center border w-full  rounded-md">
              <input
                type="email"
                className="outline-none rounded-lg w-full p-2  "
                placeholder="Email"
                onChange={(e) => handleEmail(e)}
              />
            </div>
            {invalidUser ? (
              <p className="text-red-600 text-sm font-sm">
                No user found with this email id
              </p>
            ) : null}
            <div className="flex items-center border w-full  rounded-md">
              <input
                type="password"
                className="outline-none rounded-lg w-full p-2  "
                placeholder="password"
                onChange={(e) => handlePassword(e)}
              />
            </div>
            {incorrectPassword ? (
              <p className="text-red-600 text-sm font-sm">Incorrect password</p>
            ) : null}
            <button
              className="bg-green-950 text-white rounded-lg py-2 px-5 w-full"
              type="submit"
            >
              Login
            </button>
            <hr />
            <div className="flex items-center justify-center gap-5">
              <button className="border p-5 rounded-lg">
                <FaGoogle />
              </button>
              <button className="border p-5 rounded-lg">
                <FaApple />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
