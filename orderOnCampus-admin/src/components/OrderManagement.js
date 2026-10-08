import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/orders');
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
            // Use realistic dummy data
            setOrders([
                {
                    _id: '1',
                    customerName: 'Vishal S',
                    items: [
                        { name: 'Masala Dosa', quantity: 2, price: 60 },
                        { name: 'Filter Coffee', quantity: 1, price: 20 }
                    ],
                    total: 140,
                    status: 'pending',
                    canteen: 'Main Canteen',
                    orderTime: '2024-03-03T10:30:00Z'
                },
                {
                    _id: '2',
                    customerName: 'Kiran S Mathew',
                    items: [
                        { name: 'Chicken Biryani', quantity: 1, price: 120 },
                        { name: 'Cold Coffee', quantity: 1, price: 40 }
                    ],
                    total: 160,
                    status: 'pending',
                    canteen: 'Block 2 Cafeteria',
                    orderTime: '2024-03-03T10:35:00Z'
                },
                {
                    _id: '3',
                    customerName: 'Ashish',
                    items: [
                        { name: 'Veg Fried Rice', quantity: 1, price: 80 },
                        { name: 'Manchurian', quantity: 1, price: 60 }
                    ],
                    total: 140,
                    status: 'pending',
                    canteen: 'Central Block Canteen',
                    orderTime: '2024-03-03T10:40:00Z'
                },
                {
                    _id: '4',
                    customerName: 'Isha',
                    items: [
                        { name: 'Paneer Butter Masala', quantity: 1, price: 100 },
                        { name: 'Roti', quantity: 3, price: 15 },
                        { name: 'Lassi', quantity: 1, price: 30 }
                    ],
                    total: 175,
                    status: 'pending',
                    canteen: 'Main Canteen',
                    orderTime: '2024-03-03T10:45:00Z'
                },
                {
                    _id: '5',
                    customerName: 'Anupama',
                    items: [
                        { name: 'South Indian Thali', quantity: 1, price: 120 },
                        { name: 'Buttermilk', quantity: 1, price: 20 }
                    ],
                    total: 140,
                    status: 'pending',
                    canteen: 'Block 2 Cafeteria',
                    orderTime: '2024-03-03T10:50:00Z'
                }
            ]);
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, {
                status: newStatus
            });
            fetchOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            // For demo, update UI optimistically
            setOrders(orders.map(order =>
                order._id === orderId ? { ...order, status: newStatus } : order
            ));
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'pending';
            case 'preparing': return 'preparing';
            case 'ready': return 'ready';
            case 'completed': return 'completed';
            case 'cancelled': return 'cancelled';
            default: return '';
        }
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        return order.status === filter;
    });

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const calculateTotal = (items) => {
        return items.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
    };

    return (
        <div className="order-management">
            <div className="page-header">
                <h1>Order Management</h1>
                <Link to="/" className="back-link">Back to Dashboard</Link>
            </div>

            <div className="filter-controls">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All Orders
                </button>
                <button
                    className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Pending
                </button>
                <button
                    className={`filter-btn ${filter === 'preparing' ? 'active' : ''}`}
                    onClick={() => setFilter('preparing')}
                >
                    Preparing
                </button>
                <button
                    className={`filter-btn ${filter === 'ready' ? 'active' : ''}`}
                    onClick={() => setFilter('ready')}
                >
                    Ready
                </button>
                <button
                    className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                    onClick={() => setFilter('completed')}
                >
                    Completed
                </button>
                <button
                    className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setFilter('cancelled')}
                >
                    Cancelled
                </button>
            </div>

            <div className="orders-list">
                {filteredOrders.map(order => (
                    <div key={order._id} className="order-card">
                        <div className="order-header">
                            <h3>Order #{order._id}</h3>
                            <span className={`status-badge ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                        
                        <div className="order-details">
                            <p><strong>Customer:</strong> {order.customerName}</p>
                            <p><strong>Canteen:</strong> {order.canteen}</p>
                            <p><strong>Order Time:</strong> {formatDate(order.orderTime)}</p>
                            <p><strong>Total:</strong> ${calculateTotal(order.items)}</p>
                        </div>

                        <div className="order-items">
                            <h4>Items:</h4>
                            <ul>
                                {order.items.map((item, index) => (
                                    <li key={index}>
                                        {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="order-actions">
                            {order.status === 'pending' && (
                                <button
                                    className="action-btn preparing"
                                    onClick={() => handleStatusUpdate(order._id, 'preparing')}
                                >
                                    Start Preparing
                                </button>
                            )}
                            {order.status === 'preparing' && (
                                <button
                                    className="action-btn ready"
                                    onClick={() => handleStatusUpdate(order._id, 'ready')}
                                >
                                    Mark as Ready
                                </button>
                            )}
                            {order.status === 'ready' && (
                                <button
                                    className="action-btn completed"
                                    onClick={() => handleStatusUpdate(order._id, 'completed')}
                                >
                                    Complete Order
                                </button>
                            )}
                            {(order.status === 'pending' || order.status === 'preparing') && (
                                <button
                                    className="action-btn cancel"
                                    onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                                >
                                    Cancel Order
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderManagement; 