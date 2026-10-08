import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import AddCanteen from './pages/AddCanteen';
import CanteenStaff from './pages/CanteenStaff';
import CanteenRegistration from './pages/CanteenRegistration';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AddCanteen />} />
        <Route path="/registerCanteen" element={<CanteenRegistration />} />
        <Route path="/canteenStaff/*" element={<CanteenStaff />} />
      </Routes>
    </Router>
  );
}

export default App;
