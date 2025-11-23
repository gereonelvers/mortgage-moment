import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialLocation = searchParams.get('location') || 'Garching';
    const [locationInput, setLocationInput] = useState(initialLocation);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        income: '',
        rent: '',
        equity: '0',
        interestRate: '3.5',
        repaymentRate: '2.0'
    });

    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real app, we would save this data
        navigate(`/map?location=${encodeURIComponent(locationInput)}`, { state: { formData } });
    };

    const scrollToForm = () => {
        document.getElementById('conversion-form').scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="landing-page animate-fade-in" style={{ overflowX: 'hidden' }}>
            {/* Hero Section */}
            <section className="hero" style={{
                padding: 'var(--spacing-xl) 0',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                background: '#F8F9FA',
            }}>
                {/* Abstract Organic Shapes - Optimized for mobile/desktop */}
                <div style={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-10%',
                    width: 'clamp(300px, 60vw, 800px)',
                    height: 'clamp(300px, 60vw, 800px)',
                    background: '#E3E8EC',
                    borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                    opacity: 0.5,
                    zIndex: 0,
                    animation: 'float 10s ease-in-out infinite',
                    pointerEvents: 'none'
                }}></div>

                <div className="container hero-grid" style={{
                    position: 'relative',
                    zIndex: 1,
                    paddingBottom: 'var(--spacing-xl)'
                }}>

                    {/* Left Column: Copy */}
                    <div className="animate-slide-up" style={{ textAlign: 'left' }}>
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <span style={{
                                fontFamily: 'var(--font-heading)',
                                fontStyle: 'italic',
                                fontSize: '1.2rem',
                                color: 'var(--color-text-secondary)',
                                position: 'relative'
                            }}>
                                The "Is this actually possible?" check.
                                <svg width="40" height="20" viewBox="0 0 40 20" style={{ position: 'absolute', right: '-50px', top: '0', transform: 'rotate(10deg)' }}>
                                    <path d="M0,10 Q20,0 40,10" stroke="var(--color-primary)" strokeWidth="1" fill="none" markerEnd="url(#arrow)" />
                                </svg>
                            </span>
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(3rem, 6vw, 5rem)',
                            marginBottom: 'var(--spacing-md)',
                            color: 'var(--color-text-main)',
                            lineHeight: '1.1',
                        }}>
                            Stop guessing. <br />
                            <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Start owning.</span>
                        </h1>

                        <p style={{
                            fontSize: '1.2rem',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--spacing-lg)',
                            maxWidth: '500px',
                            lineHeight: '1.6'
                        }}>
                            Join <strong>72 neighbors</strong> in {initialLocation} who found their Mortgage Moment™ this month. No bank jargon, just straight answers.
                        </p>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={scrollToForm}
                                className="btn btn-primary animate-float"
                                style={{
                                    fontSize: '1.1rem',
                                    padding: '1rem 2.5rem',
                                    boxShadow: '0 10px 25px rgba(45, 52, 54, 0.2)',
                                    width: 'max-content'
                                }}
                            >
                                Check My Budget
                            </button>
                            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                Takes 30 seconds
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div id="conversion-form" className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="card glass-card" style={{
                            padding: 'var(--spacing-xl)',
                            border: '1px solid var(--color-border)',
                            background: 'white',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ width: '10px', height: '10px', background: '#2D3436', borderRadius: '50%' }}></div>
                                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Let's run the numbers.</h3>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="input-group">
                                    <label className="input-label" htmlFor="name">First Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        className="input-field"
                                        placeholder="e.g. Alex"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        style={{ background: '#F8F9FA' }}
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label" htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="input-field"
                                        placeholder="alex@example.com"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        style={{ background: '#F8F9FA' }}
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label" htmlFor="location">Where do you want to buy?</label>
                                    <input
                                        type="text"
                                        id="location"
                                        name="location"
                                        className="input-field"
                                        placeholder="e.g. München"
                                        required
                                        value={locationInput}
                                        onChange={(e) => setLocationInput(e.target.value)}
                                        style={{ background: '#F8F9FA' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="income">Net Income</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>€</span>
                                            <input
                                                type="number"
                                                id="income"
                                                name="income"
                                                className="input-field"
                                                placeholder="4000"
                                                required
                                                value={formData.income}
                                                onChange={handleChange}
                                                style={{ paddingLeft: '30px', background: '#F8F9FA' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label" htmlFor="rent">Current Rent</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>€</span>
                                            <input
                                                type="number"
                                                id="rent"
                                                name="rent"
                                                className="input-field"
                                                placeholder="1200"
                                                required
                                                value={formData.rent}
                                                onChange={handleChange}
                                                style={{ paddingLeft: '30px', background: '#F8F9FA' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label" htmlFor="equity">Savings / Equity</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>€</span>
                                        <input
                                            type="number"
                                            id="equity"
                                            name="equity"
                                            className="input-field"
                                            placeholder="50000"
                                            required
                                            value={formData.equity}
                                            onChange={handleChange}
                                            style={{ paddingLeft: '30px', background: '#F8F9FA' }}
                                        />
                                    </div>
                                </div>

                                {/* Advanced Settings Toggle */}
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            padding: 0,
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontFamily: 'var(--font-family)',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <span style={{ display: 'inline-block', transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                                        Fine-tune assumptions
                                    </button>
                                </div>

                                {/* Advanced Settings Fields */}
                                {showAdvanced && (
                                    <div className="animate-fade-in" style={{
                                        background: '#F8F9FA',
                                        padding: 'var(--spacing-md)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--spacing-md)',
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label className="input-label" htmlFor="interestRate">Interest Rate (%)</label>
                                                <input
                                                    type="number"
                                                    id="interestRate"
                                                    name="interestRate"
                                                    className="input-field"
                                                    step="0.1"
                                                    placeholder="3.5"
                                                    value={formData.interestRate}
                                                    onChange={handleChange}
                                                    style={{ background: 'white' }}
                                                />
                                            </div>
                                            <div className="input-group" style={{ marginBottom: 0 }}>
                                                <label className="input-label" htmlFor="repaymentRate">Repayment Rate (%)</label>
                                                <input
                                                    type="number"
                                                    id="repaymentRate"
                                                    name="repaymentRate"
                                                    className="input-field"
                                                    step="0.1"
                                                    placeholder="2.0"
                                                    value={formData.repaymentRate}
                                                    onChange={handleChange}
                                                    style={{ background: 'white' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        marginTop: 'var(--spacing-sm)',
                                        padding: '1rem',
                                        fontSize: '1.1rem',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span>Find Properties</span>
                                    <span>→</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
