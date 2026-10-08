import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import React, { useState } from "react";
import {
  FaApple,
  FaCheckCircle,
  FaGoogle,
  FaTimesCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function RegisterForm({ regActive, setReginActive }) {
  const navigation = useNavigate();
  const [name, setName] = useState("");
  const [nameVerify, setNameVerify] = useState(false);
  const [email, setEmail] = useState("");
  const [emailVerify, setEmailVerify] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordVerify, setPasswordVerify] = useState(false);
  const [cpassword, setCpassword] = useState("");
  const [cpasswordVerify, setCpasswordVerify] = useState(false);
  const [userID, setUserID] = useState("");

  const handleName = (e) => {
    const value = e.target.value;
    setName(value);
    setNameVerify(false);
    const regex = /^[a-zA-Z\s]{3,}$/;
    if (regex.test(value)) {
      setNameVerify(true);
    }
  };
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
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (regex.test(value)) {
      setPasswordVerify(true);
    }
  };
  const handleCpassword = (e) => {
    const value = e.target.value;
    setCpassword(value);
    setCpasswordVerify(false);
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    if (password === value && regex.test(value)) {
      setCpasswordVerify(true);
    }
    console.log(nameVerify);
    console.log(emailVerify);
    console.log(passwordVerify);
    console.log(cpasswordVerify);
  };

  const handleForm = (e) => {
    e.preventDefault();
    if (!nameVerify || !emailVerify || !passwordVerify || !cpasswordVerify) {
      alert("Please fill the madatory fields");
      return;
    }
    const data = {
      name:name,
      email,
      password,
    };
    axios
      .post("http://localhost:5001/staff/register", data)
      .then((res) => {
        console.log(res)
        if (res.data === "user already exists") {
          console.log("inside if ");
          alert("Email Already in use");
        } else {
          console.log("inside else ");
          console.log("outside if ");
          console.log("====================================");
          // setUserID(res.data.data._id);
          console.log("====================================");
          setName("");
          setEmail("");
          setPassword("");
          setCpassword("");
          // cookieFun();
          navigation("/registerCanteen");
        }
      })
      .catch((e) => {
        console.log("error", e);
      });
  };

  // const cookieFun = async () => {
  //   const data = {
  //     name,
  //     email,
  //     password,
  //   };
  //   await axios
  //     .get(`http://localhost:5001/set-cookie/${data.email}`)
  //     .then((req, res) => {
  //       console.log;
  //     })
  //     .catch((e) => {
  //       console.log("error", e);
  //     });
  // };

  if (!regActive) {
    return null;
  }
  return (
    <div className="fixed w-full inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center content-center">
      <div className="bg-white w-1/4 p-5 rounded-lg">
        <div className="flex items-center justify-between mb-10">
          <h4 className="text-gray-500 text-2xl ">Register</h4>
          <FontAwesomeIcon
            icon={faXmark}
            onClick={() => {setReginActive(false);window.location.reload();}}
            className="h-5"
            color="gray"
          />
        </div>
        <div className="flex items-center justify-center w-full">
          <form onSubmit={handleForm} method="post" className="space-y-5">
            <div className="flex items-center border w-full  rounded-md">
              <input
                type="Text"
                className="w-full rounded-md p-2 outline-none "
                placeholder="Full Name"
                onChange={(e) => handleName(e)}
              />
              {name.length < 1 ? null : nameVerify ? (
                <FaCheckCircle className="m-2 text-green-900" />
              ) : (
                <FaTimesCircle className="m-2 text-red-700 " />
              )}
            </div>
            {name.length < 1 ? null : nameVerify ? null : (
              <p className="font-light text-sm text-red-700">
                name should be more than 2 characters and only contain letters
              </p>
            )}
            <div className="flex items-center border w-full  rounded-md">
              <input
                type="email"
                className="outline-none rounded-lg w-full p-2  "
                onChange={(e) => handleEmail(e)}
                placeholder="Email"
              />
              {email.length < 1 ? null : emailVerify ? (
                <FaCheckCircle className="m-2 text-green-900" />
              ) : (
                <FaTimesCircle className="m-2 text-red-700 " />
              )}
            </div>
            {email.length < 1 ? null : emailVerify ? null : (
              <p className="font-light text-sm text-red-700">
                enter a valid email address
              </p>
            )}
            <div className="flex items-center border w-full  rounded-md">
              <input
                type="password"
                className="outline-none rounded-lg w-full p-2  "
                placeholder="password"
                onChange={(e) => handlePassword(e)}
              />
              {password.length < 1 ? null : passwordVerify ? (
                <FaCheckCircle className="m-2 text-green-900" />
              ) : (
                <FaTimesCircle className="m-2 text-red-700 " />
              )}
            </div>
            {password.length < 1 ? null : passwordVerify ? null : (
              <p className="font-light text-sm text-red-700">
                Ensure password contains minimum 8 characters with at least one
                number
              </p>
            )}
            <div className="flex items-center border w-full  rounded-md">
              <input
                type="password"
                className="rounded-lg w-full p-2 outline-none "
                placeholder="Confirm password"
                onChange={(e) => handleCpassword(e)}
              />
              {cpassword.length < 1 ? null : cpasswordVerify ? (
                <FaCheckCircle className="m-2 text-green-900" />
              ) : (
                <FaTimesCircle className="m-2 text-red-700 " />
              )}
            </div>
            {cpassword.length < 1 ? null : cpasswordVerify ? null : (
              <p className="font-light text-sm text-red-700">
                Passwords doesn't match
              </p>
            )}
            <button
              type="submit"
              className="bg-green-950 text-white rounded-lg py-2 px-5 w-full"
            >
              Create Account
            </button>
            <div className="flex items-center gap-5 ">
              <input type="checkbox" />
              <p className="text-sm">
                I agree to OrderOnCampus's
                <span className="text-green-600">
                  {"\t"} Terms of Service, Privacy Policy
                </span>
                {"\t"} and
                <span className="text-green-600">{"\t"} Content Policies</span>
              </p>
            </div>
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
          <hr />
        </div>
      </div>
    </div>
  );
}

export default RegisterForm;
