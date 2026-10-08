import React, { useState, useEffect } from 'react';
import { Link, useParams, useHistory } from 'react-router-dom';
import axios from 'axios';

const MenuManagement = () => {
    const { canteenId } = useParams();
    const [menuItems, setMenuItems] = useState([]);
    const [canteen, setCanteen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMenuItem, setNewMenuItem] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        isAvailable: true,
        stockQuantity: 0,
        image: ''
    });
    const [editingMenuItem, setEditingMenuItem] = useState(null);
    const history = useHistory();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                if (!token) {
                    history.push('/login');
                    return;
                }

                // Fetch canteen details
                const canteenResponse = await axios.get(`http://localhost:5000/api/canteens/${canteenId}/get-canteen`);
                setCanteen(canteenResponse.data);

                // Fetch menu items for this canteen
                const menuResponse = await axios.get(`http://localhost:5000/api/canteens/${canteenId}/menu`);
                setMenuItems(menuResponse.data || []);
            } catch (err) {
                setError('Failed to load menu data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [canteenId, history]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewMenuItem({
            ...newMenuItem,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleEditInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditingMenuItem({
            ...editingMenuItem,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleAddMenuItem = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const menuItemData = {
                ...newMenuItem,
                canteenId,
                price: parseFloat(newMenuItem.price),
                stockQuantity: parseInt(newMenuItem.stockQuantity, 10)
            };

            const response = await axios.post(
                'http://localhost:5000/api/menu/add', 
                menuItemData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMenuItems([...menuItems, response.data]);
            setNewMenuItem({
                name: '',
                description: '',
                price: '',
                category: '',
                isAvailable: true,
                stockQuantity: 0,
                image: ''
            });
            setShowAddForm(false);
        } catch (err) {
            setError('Failed to add menu item');
            console.error(err);
        }
    };

    const handleEditMenuItem = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const menuItemData = {
                ...editingMenuItem,
                price: parseFloat(editingMenuItem.price),
                stockQuantity: parseInt(editingMenuItem.stockQuantity, 10)
            };

            await axios.put(
                `http://localhost:5000/api/menu/${editingMenuItem._id}`, 
                menuItemData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMenuItems(menuItems.map(item => 
                item._id === editingMenuItem._id ? menuItemData : item
            ));
            setEditingMenuItem(null);
        } catch (err) {
            setError('Failed to update menu item');
            console.error(err);
        }
    };

    const handleDeleteMenuItem = async (menuItemId) => {
        if (window.confirm('Are you sure you want to delete this menu item?')) {
            try {
                const token = localStorage.getItem('adminToken');
                await axios.delete(
                    `http://localhost:5000/api/menu/delete/${menuItemId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                setMenuItems(menuItems.filter(item => item._id !== menuItemId));
            } catch (err) {
                setError('Failed to delete menu item');
                console.error(err);
            }
        }
    };

    const handleToggleAvailability = async (menuItem) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(
                `http://localhost:5000/api/menu/availability/${menuItem._id}`, 
                { isAvailable: !menuItem.isAvailable },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMenuItems(menuItems.map(item => 
                item._id === menuItem._id ? { ...item, isAvailable: !item.isAvailable } : item
            ));
        } catch (err) {
            setError('Failed to update item availability');
            console.error(err);
        }
    };

    const handleUpdateStock = async (menuItem, newStock) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(
                `http://localhost:5000/api/menu/${menuItem._id}/stock`, 
                { stockQuantity: newStock },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMenuItems(menuItems.map(item => 
                item._id === menuItem._id ? { ...item, stockQuantity: newStock } : item
            ));
        } catch (err) {
            setError('Failed to update stock quantity');
            console.error(err);
        }
    };

    if (loading) return <div className="loading">Loading menu data...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="menu-management">
            <header className="page-header">
                <h1>Menu Management: {canteen?.name}</h1>
                <Link to="/canteens" className="back-link">Back to Canteens</Link>
            </header>

            <div className="action-bar">
                <button 
                    className="add-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? 'Cancel' : 'Add New Menu Item'}
                </button>
            </div>

            {showAddForm && (
                <div className="form-container">
                    <h2>Add New Menu Item</h2>
                    <form onSubmit={handleAddMenuItem}>
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={newMenuItem.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={newMenuItem.description}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="price">Price (₹)</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                min="0"
                                step="0.01"
                                value={newMenuItem.price}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                name="category"
                                value={newMenuItem.category}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select a category</option>
                                <option value="Breakfast">Breakfast</option>
                                <option value="Lunch">Lunch</option>
                                <option value="Dinner">Dinner</option>
                                <option value="Snacks">Snacks</option>
                                <option value="Beverages">Beverages</option>
                                <option value="Desserts">Desserts</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="stockQuantity">Stock Quantity</label>
                            <input
                                type="number"
                                id="stockQuantity"
                                name="stockQuantity"
                                min="0"
                                value={newMenuItem.stockQuantity}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="form-group checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    name="isAvailable"
                                    checked={newMenuItem.isAvailable}
                                    onChange={handleInputChange}
                                />
                                Available
                            </label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="image">Image URL</label>
                            <input
                                type="text"
                                id="image"
                                name="image"
                                value={newMenuItem.image}
                                onChange={handleInputChange}
                                placeholder="Enter image URL (optional)"
                            />
                        </div>
                        <button type="submit" className="submit-btn">Add Menu Item</button>
                    </form>
                </div>
            )}

            {editingMenuItem && (
                <div className="form-container">
                    <h2>Edit Menu Item</h2>
                    <form onSubmit={handleEditMenuItem}>
                        <div className="form-group">
                            <label htmlFor="edit-name">Name</label>
                            <input
                                type="text"
                                id="edit-name"
                                name="name"
                                value={editingMenuItem.name}
                                onChange={handleEditInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="edit-description">Description</label>
                            <textarea
                                id="edit-description"
                                name="description"
                                value={editingMenuItem.description}
                                onChange={handleEditInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="edit-price">Price (₹)</label>
                            <input
                                type="number"
                                id="edit-price"
                                name="price"
                                min="0"
                                step="0.01"
                                value={editingMenuItem.price}
                                onChange={handleEditInputChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="edit-category">Category</label>
                            <select
                                id="edit-category"
                                name="category"
                                value={editingMenuItem.category}
                                onChange={handleEditInputChange}
                                required
                            >
                                <option value="">Select a category</option>
                                <option value="Breakfast">Breakfast</option>
                                <option value="Lunch">Lunch</option>
                                <option value="Dinner">Dinner</option>
                                <option value="Snacks">Snacks</option>
                                <option value="Beverages">Beverages</option>
                                <option value="Desserts">Desserts</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="edit-stockQuantity">Stock Quantity</label>
                            <input
                                type="number"
                                id="edit-stockQuantity"
                                name="stockQuantity"
                                min="0"
                                value={editingMenuItem.stockQuantity}
                                onChange={handleEditInputChange}
                                required
                            />
                        </div>
                        <div className="form-group checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    name="isAvailable"
                                    checked={editingMenuItem.isAvailable}
                                    onChange={handleEditInputChange}
                                />
                                Available
                            </label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="edit-image">Image URL</label>
                            <input
                                type="text"
                                id="edit-image"
                                name="image"
                                value={editingMenuItem.image}
                                onChange={handleEditInputChange}
                                placeholder="Enter image URL (optional)"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="submit-btn">Save Changes</button>
                            <button 
                                type="button" 
                                className="cancel-btn"
                                onClick={() => setEditingMenuItem(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="menu-items-list">
                {menuItems.length === 0 ? (
                    <p className="no-items">No menu items found</p>
                ) : (
                    menuItems.map(item => (
                        <div key={item._id} className={`menu-item-card ${!item.isAvailable ? 'unavailable' : ''}`}>
                            <div className="menu-item-header">
                                <h3>{item.name}</h3>
                                <span className={`status-badge ${item.isAvailable ? 'available' : 'unavailable'}`}>
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                            {item.image && (
                                <div className="menu-item-image">
                                    <img src={item.image} alt={item.name} />
                                </div>
                            )}
                            <div className="menu-item-details">
                                <p><strong>Description:</strong> {item.description}</p>
                                <p><strong>Price:</strong> ₹{parseFloat(item.price).toFixed(2)}</p>
                                <p><strong>Category:</strong> {item.category}</p>
                                <p><strong>Stock:</strong> {item.stockQuantity}</p>
                            </div>
                            <div className="menu-item-actions">
                                <div className="stock-controls">
                                    <button 
                                        onClick={() => handleUpdateStock(item, Math.max(0, item.stockQuantity - 1))}
                                        className="stock-btn decrease"
                                        disabled={item.stockQuantity <= 0}
                                    >
                                        -
                                    </button>
                                    <span className="stock-value">{item.stockQuantity}</span>
                                    <button 
                                        onClick={() => handleUpdateStock(item, item.stockQuantity + 1)}
                                        className="stock-btn increase"
                                    >
                                        +
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleToggleAvailability(item)}
                                    className={`availability-btn ${item.isAvailable ? 'make-unavailable' : 'make-available'}`}
                                >
                                    {item.isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}
                                </button>
                                <button 
                                    onClick={() => setEditingMenuItem(item)}
                                    className="edit-btn"
                                >
                                    Edit
                                </button>
                                <button 
                                    onClick={() => handleDeleteMenuItem(item._id)}
                                    className="delete-btn"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MenuManagement; 