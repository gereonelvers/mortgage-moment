import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = searchParams.get('location') || 'your area';

    const [formData, setFormData] = useState({
        email: '',
        income: '',
        rent: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real app, we would save this data
        navigate(`/map?location=${encodeURIComponent(location)}`, { state: { formData } });
    };

    const scrollToForm = () => {
        document.getElementById('conversion-form').scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero" style={{
                padding: 'var(--spacing-xl) 0',
                textAlign: 'center',
                minHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #FFF5F5 0%, #FFFFFF 100%)'
            }}>
                <div className="container">
                    <h1 style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-main)' }}>
                        <span style={{ color: 'var(--color-primary)' }}>{Math.floor(Math.random() * 50) + 12} people</span> have bought a house in {location} in the past six months.
                    </h1>
                    <p style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                        See if this is right for you.
                    </p>
                    <button onClick={scrollToForm} className="btn btn-primary" style={{ fontSize: '1.25rem', padding: '1rem 2.5rem' }}>
                        Check Affordability
                    </button>
                </div>
            </section>

            {/* Conversion Form Section */}
            <section id="conversion-form" style={{ padding: 'var(--spacing-xl) 0', backgroundColor: 'var(--color-surface)' }}>
                <div className="container" style={{ maxWidth: '600px' }}>
                    <div className="card">
                        <h2 style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>Get Your Personal Mortgage Moment</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label className="input-label" htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className="input-field"
                                    placeholder="you@example.com"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="income">Monthly Net Income (€)</label>
                                <input
                                    type="number"
                                    id="income"
                                    name="income"
                                    className="input-field"
                                    placeholder="e.g. 4000"
                                    required
                                    value={formData.income}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="rent">Current Monthly Rent (€)</label>
                                <input
                                    type="number"
                                    id="rent"
                                    name="rent"
                                    className="input-field"
                                    placeholder="e.g. 1200"
                                    required
                                    value={formData.rent}
                                    onChange={handleChange}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}>
                                Show Map
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
