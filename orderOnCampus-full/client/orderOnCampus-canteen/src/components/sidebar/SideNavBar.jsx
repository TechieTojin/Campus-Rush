import React from "react";
import orderIcon from "../../assets/order.svg";
import signoutIcon from "../../assets/sign-out.svg";
import userIcon from "../../assets/user.svg";
import menuIcon from "../../assets/menu.svg";
import chartIcon from "../../assets/metrics.svg";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
function SideNavBar() {
  const navigate = useNavigate();
  const logOut = () => {
    localStorage.removeItem("token");
    axios.get("http://localhost:5001/staff/logout").then((res) => {
      navigate("/");
      window.location.reload();
    });
  };
  return (
    <div className="flex h-screen max-w-16 min-w-16 flex-col justify-between border-e bg-white  ">
      <div>
        <div className="border-t border-gray-100 ">
          <div className="px-2">
            <ul className="space-y-1 border-t border-gray-100 pt-4">
              <li className="border-b border-gray-100 pb-2">
                <Link
                  to="/canteenStaff"
                  className="group relative flex justify-center rounded px-2 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <img src={orderIcon} alt="menu" />

                  <span className="invisible absolute start-full top-1/2 ms-4 -translate-y-1/2 rounded bg-gray-900 px-2 py-1.5 text-xs font-medium text-white group-hover:visible">
                    Orders
                  </span>
                </Link>
              </li>
              <li className="border-b border-gray-100 pb-2">
                <Link
                  to="/canteenStaff/menu"
                  className="group relative flex justify-center rounded px-2 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <img src={menuIcon} alt="menu" />

                  <span className="invisible absolute start-full top-1/2 ms-4 -translate-y-1/2 rounded bg-gray-900 px-2 py-1.5 text-xs font-medium text-white group-hover:visible">
                    Menu
                  </span>
                </Link>
              </li>

              <li className="border-b border-gray-100 pb-2">
                <Link
                  to="/canteenStaff/metrics"
                  className="group relative flex justify-center rounded px-2 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <img src={chartIcon} alt="metrics" />

                  <span className="invisible absolute start-full top-1/2 ms-4 -translate-y-1/2 rounded bg-gray-900 px-2 py-1.5 text-xs font-medium text-white group-hover:visible">
                    Metrics
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/canteenStaff/profile"
                  className="group relative flex justify-center rounded px-2 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  <img src={userIcon} alt="profile" />
                  <span className="invisible absolute start-full top-1/2 ms-4 -translate-y-1/2 rounded bg-gray-900 px-2 py-1.5 text-xs font-medium text-white group-hover:visible">
                    Profile
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="sticky inset-x-0 bottom-0 border-t border-gray-100 bg-white p-2">
        <form action="/" onSubmit={logOut}>
          <button
            type="submit"
            className="group relative flex w-full justify-center rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <img
              src={signoutIcon}
              alt="signOut"
              style={{ stroke: "rgb(20, 83, 45)" }}
            />

            <span className="invisible absolute start-full top-1/2 ms-4 -translate-y-1/2 rounded bg-gray-900 px-2 py-1.5 text-xs font-medium text-white group-hover:visible">
              Logout
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default SideNavBar;
