import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalUsers: 0,
        totalCanteens: 0,
        activeOrders: 0
    });

    useEffect(() => {
        // Fetch dashboard statistics
        const fetchStats = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/admin/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
                // Use dummy data for now
                setStats({
                    totalOrders: 25,
                    totalUsers: 150,
                    totalCanteens: 3,
                    activeOrders: 5
                });
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>Admin Dashboard</h1>
            </div>

            {/* Statistics Section */}
            <div className="stats-container">
                <div className="stat-card">
                    <h3>Total Orders</h3>
                    <div className="stat-value">{stats.totalOrders}</div>
                </div>
                <div className="stat-card">
                    <h3>Active Orders</h3>
                    <div className="stat-value">{stats.activeOrders}</div>
                </div>
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <div className="stat-value">{stats.totalUsers}</div>
                </div>
                <div className="stat-card">
                    <h3>Total Canteens</h3>
                    <div className="stat-value">{stats.totalCanteens}</div>
                </div>
            </div>

            {/* Navigation Cards */}
            <div className="admin-nav">
                <div className="nav-card">
                    <h3>Order Management</h3>
                    <p>View and manage all orders from different canteens</p>
                    <Link to="/orders" className="nav-link">Manage Orders</Link>
                </div>

                <div className="nav-card">
                    <h3>Canteen Management</h3>
                    <p>Add, edit, or remove canteens and their details</p>
                    <Link to="/canteens" className="nav-link">Manage Canteens</Link>
                </div>

                <div className="nav-card">
                    <h3>User Management</h3>
                    <p>View and manage user accounts</p>
                    <Link to="/users" className="nav-link">Manage Users</Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard; 