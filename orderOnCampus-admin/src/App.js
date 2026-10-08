import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect, Link } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import OrderManagement from './components/OrderManagement';
import CanteenManagement from './components/CanteenManagement';
import MenuManagement from './components/MenuManagement';
import UserManagement from './components/UserManagement';
import './styles.css';

// Import icons (you'll need to install react-icons: npm install react-icons)
import { FaHome, FaUtensils, FaClipboardList, FaUsers, FaBars, FaTimes } from 'react-icons/fa';

const App = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <Router>
            <div className="admin-layout">
                <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                    <div className="sidebar-header">
                        <h2>OrderOnCampus</h2>
                        <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <FaTimes /> : <FaBars />}
                        </button>
                    </div>
                    <nav className="sidebar-nav">
                        <Link to="/" className="nav-item">
                            <FaHome /> <span>Dashboard</span>
                        </Link>
                        <Link to="/orders" className="nav-item">
                            <FaClipboardList /> <span>Orders</span>
                        </Link>
                        <Link to="/canteens" className="nav-item">
                            <FaUtensils /> <span>Canteens</span>
                        </Link>
                        <Link to="/users" className="nav-item">
                            <FaUsers /> <span>Users</span>
                        </Link>
                    </nav>
                    <div className="sidebar-footer">
                        <p>© 2024 OrderOnCampus</p>
                        <p>Christ University</p>
                    </div>
                </div>

                <div className="main-content">
                    <div className="top-bar">
                        <button className="mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <FaBars />
                        </button>
                        <div className="top-bar-right">
                            <span className="admin-name">Admin</span>
                            <button className="logout-btn">Logout</button>
                        </div>
                    </div>

                    <div className="content-area">
                        <Switch>
                            <Route path="/" exact component={AdminDashboard} />
                            <Route path="/orders" component={OrderManagement} />
                            <Route path="/canteens" component={CanteenManagement} />
                            <Route path="/menu/:canteenId" component={MenuManagement} />
                            <Route path="/users" component={UserManagement} />
                            <Redirect to="/" />
                        </Switch>
                    </div>
                </div>
            </div>
        </Router>
    );
};

export default App; 