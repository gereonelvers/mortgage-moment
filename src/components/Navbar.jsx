import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/mm-wordmark.png';
import './Navbar.css';

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo-link">
                    <img src={logo} alt="Mortgage Moment" className="navbar-logo" />
                </Link>
                <ul className="navbar-menu">
                    <li>
                        <Link to="/" className="navbar-item">Home</Link>
                    </li>
                    <li>
                        <Link to="/map" className="navbar-item">Map</Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
