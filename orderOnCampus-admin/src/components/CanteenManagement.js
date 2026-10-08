import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const CanteenManagement = () => {
    const [canteens, setCanteens] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCanteen, setEditingCanteen] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        description: '',
        openingTime: '',
        closingTime: '',
        isOpen: true
    });

    useEffect(() => {
        fetchCanteens();
    }, []);

    const fetchCanteens = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/canteens');
            setCanteens(response.data);
        } catch (error) {
            console.error('Error fetching canteens:', error);
            // Use realistic Christ University canteen data
            setCanteens([
                {
                    _id: '1',
                    name: 'Main Canteen',
                    location: 'Central Block Ground Floor',
                    description: 'Main campus canteen serving South Indian, North Indian, and Chinese cuisine',
                    openingTime: '08:00',
                    closingTime: '18:00',
                    isOpen: true
                },
                {
                    _id: '2',
                    name: 'Block 2 Cafeteria',
                    location: 'Block 2 First Floor',
                    description: 'Modern cafeteria serving quick bites, beverages, and meals',
                    openingTime: '09:00',
                    closingTime: '17:00',
                    isOpen: true
                },
                {
                    _id: '3',
                    name: 'Central Block Canteen',
                    location: 'Central Block Second Floor',
                    description: 'Vegetarian canteen specializing in South Indian dishes',
                    openingTime: '08:30',
                    closingTime: '17:30',
                    isOpen: true
                },
                {
                    _id: '4',
                    name: 'Library Café',
                    location: 'Central Library Building',
                    description: 'Coffee shop and snack corner near the library',
                    openingTime: '09:00',
                    closingTime: '20:00',
                    isOpen: true
                },
                {
                    _id: '5',
                    name: 'Food Court',
                    location: 'Student Center',
                    description: 'Multi-cuisine food court with various food stalls',
                    openingTime: '10:00',
                    closingTime: '19:00',
                    isOpen: true
                }
            ]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCanteen) {
                await axios.put(`http://localhost:5000/api/canteens/${editingCanteen._id}`, formData);
            } else {
                await axios.post('http://localhost:5000/api/canteens', formData);
            }
            fetchCanteens();
            resetForm();
        } catch (error) {
            console.error('Error saving canteen:', error);
            // For demo, just update the UI optimistically
            if (editingCanteen) {
                setCanteens(canteens.map(c => 
                    c._id === editingCanteen._id ? { ...c, ...formData } : c
                ));
            } else {
                setCanteens([...canteens, { ...formData, _id: Date.now().toString() }]);
            }
            resetForm();
        }
    };

    const handleEdit = (canteen) => {
        setEditingCanteen(canteen);
        setFormData({
            name: canteen.name,
            location: canteen.location,
            description: canteen.description,
            openingTime: canteen.openingTime,
            closingTime: canteen.closingTime,
            isOpen: canteen.isOpen
        });
        setShowAddForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this canteen?')) {
            try {
                await axios.delete(`http://localhost:5000/api/canteens/${id}`);
                fetchCanteens();
            } catch (error) {
                console.error('Error deleting canteen:', error);
                // For demo, just update the UI optimistically
                setCanteens(canteens.filter(c => c._id !== id));
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            description: '',
            openingTime: '',
            closingTime: '',
            isOpen: true
        });
        setEditingCanteen(null);
        setShowAddForm(false);
    };

    return (
        <div className="canteen-management">
            <div className="page-header">
            <h1>Canteen Management</h1>
                <Link to="/" className="back-link">Back to Dashboard</Link>
            </div>

            <div className="action-bar">
                <button 
                    className="add-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? 'Cancel' : 'Add New Canteen'}
                </button>
            </div>

            {showAddForm && (
                <div className="form-container">
                    <h2>{editingCanteen ? 'Edit Canteen' : 'Add New Canteen'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Canteen Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="location">Location</label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="openingTime">Opening Time</label>
                            <input
                                type="time"
                                id="openingTime"
                                name="openingTime"
                                value={formData.openingTime}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="closingTime">Closing Time</label>
                            <input
                                type="time"
                                id="closingTime"
                                name="closingTime"
                                value={formData.closingTime}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group checkbox">
                            <label htmlFor="isOpen">
                                <input
                                    type="checkbox"
                                    id="isOpen"
                                    name="isOpen"
                                    checked={formData.isOpen}
                                    onChange={handleInputChange}
                                />
                                Currently Open
                            </label>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="submit-btn">
                                {editingCanteen ? 'Update Canteen' : 'Add Canteen'}
                            </button>
                            <button type="button" className="cancel-btn" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="canteens-list">
                {canteens.map(canteen => (
                    <div key={canteen._id} className="canteen-card">
                        <div className="canteen-header">
                            <h3>{canteen.name}</h3>
                            <span className={`status-badge ${canteen.isOpen ? 'open' : 'closed'}`}>
                                {canteen.isOpen ? 'Open' : 'Closed'}
                            </span>
                        </div>
                        <div className="canteen-details">
                            <p><strong>Location:</strong> {canteen.location}</p>
                            <p><strong>Description:</strong> {canteen.description}</p>
                            <p><strong>Hours:</strong> {canteen.openingTime} - {canteen.closingTime}</p>
                        </div>
                        <div className="canteen-actions">
                            <button 
                                className="edit-btn"
                                onClick={() => handleEdit(canteen)}
                            >
                                Edit
                            </button>
                            <button 
                                className="delete-btn"
                                onClick={() => handleDelete(canteen._id)}
                            >
                                Delete
                            </button>
                            <Link 
                                to={`/menu/${canteen._id}`}
                                className="menu-btn"
                            >
                                Manage Menu
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CanteenManagement; 