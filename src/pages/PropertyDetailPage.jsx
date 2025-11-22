import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';


const PropertyDetailPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [emailSent, setEmailSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [displayProperty, setDisplayProperty] = useState(location.state?.property || null);
    const [loading, setLoading] = useState(!location.state?.property);

    // Extract user email from navigation state
    const userEmail = location.state?.formData?.email;

    useEffect(() => {
        if (!displayProperty) {
            const fetchProperty = async () => {
                try {
                    const response = await fetch('/properties.min.json');
                    const data = await response.json();
                    const foundItem = data.find(p => p.id === id);

                    if (foundItem) {
                        setDisplayProperty({
                            id: foundItem.id,
                            title: foundItem.t,
                            address: {
                                lat: foundItem.lat,
                                lon: foundItem.lng,
                                street: foundItem.l,
                                postcode: foundItem.pc,
                                city: foundItem.c
                            },
                            buyingPrice: foundItem.p,
                            pricePerSqm: foundItem.s ? Math.round(foundItem.p / foundItem.s) : 0,
                            rooms: foundItem.r,
                            squareMeter: foundItem.s,
                            images: foundItem.imgs.map(url => ({ originalUrl: url })),
                            floor: 0
                        });
                    } else {
                        // Fallback if not found
                        setDisplayProperty({
                            id: 'mock-id',
                            title: 'Property Not Found',
                            address: {
                                street: 'Unknown',
                                postcode: '00000',
                                city: 'Unknown',
                                lat: 48.1374,
                                lon: 11.5755
                            },
                            buyingPrice: 0,
                            pricePerSqm: 0,
                            rooms: 0,
                            squareMeter: 0,
                            floor: 0,
                            images: []
                        });
                    }
                } catch (error) {
                    console.error("Error loading property:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchProperty();
        }
    }, [id, displayProperty]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!displayProperty) {
        return <div>Property not found</div>;
    }

    // Mock Fit Score
    const fitScore = Math.floor(Math.random() * 20) + 80; // 80-99

    const handleEmail = async () => {
        if (!userEmail) {
            alert('Please enter your email address on the landing page first.');
            return;
        }

        setSending(true);

        try {
            const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: {
                    name: import.meta.env.VITE_SENDER_NAME || "Mortgage Moment",
                    email: import.meta.env.VITE_SENDER_EMAIL || "info@mortgagemoment.com"
                },
                to: [
                    {
                        email: userEmail,
                        name: "User"
                    }
                ],
                subject: `Inquiry about ${displayProperty.title}`,
                htmlContent: `<html><head></head><body><p>Hello,</p><p>I am interested in the property at ${displayProperty.address.street}, ${displayProperty.address.city}.</p><p>Price: €${displayProperty.buyingPrice.toLocaleString()}</p></body></html>`
            }, {
                headers: {
                    'accept': 'application/json',
                    'api-key': import.meta.env.VITE_BREVO_API_KEY,
                    'content-type': 'application/json'
                }
            });
            console.log('Email sent successfully! Response:', response);
            setEmailSent(true);
        } catch (error) {
            console.error("Error sending email:", error);
            console.error("Error details:", error.response?.data);
            alert(`Failed to send email: ${error.response?.data?.message || error.message}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="property-detail-page" style={{ paddingBottom: 'var(--spacing-xl)' }}>
            {/* Image Header */}
            <div style={{ height: '60vh', width: '100%', overflow: 'hidden', position: 'relative' }}>
                {displayProperty.images && displayProperty.images.length > 0 ? (
                    <img
                        src={displayProperty.images[0].originalUrl}
                        alt={displayProperty.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://placehold.co/1200x800?text=No+Image' }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        No Image
                    </div>
                )}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        position: 'absolute',
                        top: 'var(--spacing-md)',
                        left: 'var(--spacing-md)',
                        background: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ←
                </button>
            </div>

            <div className="container" style={{ marginTop: '-100px', position: 'relative', zIndex: 10 }}>
                <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-xs)' }}>{displayProperty.title}</h1>
                            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                                {displayProperty.address.street}, {displayProperty.address.postcode} {displayProperty.address.city}
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <strong>{displayProperty.rooms}</strong> Rooms
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <strong>{displayProperty.squareMeter}</strong> m²
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <strong>{displayProperty.floor}</strong> Floor
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: 'var(--spacing-xs)' }}>
                                €{displayProperty.buyingPrice.toLocaleString()}
                            </h2>
                            <p style={{ color: 'var(--color-text-secondary)' }}>
                                {displayProperty.pricePerSqm ? `€${displayProperty.pricePerSqm.toLocaleString()}/m²` : ''}
                            </p>
                        </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-lg) 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-xl)' }}>
                        <div>
                            <h3>Description</h3>
                            <p style={{ lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
                                {/* Mock description since API might not return full text */}
                                This beautiful property located in the heart of {displayProperty.address.city} offers a unique opportunity for both investors and owner-occupiers.
                                With its modern amenities, spacious layout, and prime location, it represents a perfect blend of comfort and convenience.
                                The property features high-quality finishes, ample natural light, and is situated close to public transport, shops, and schools.
                                Don't miss out on this "Mortgage Moment"!
                            </p>
                        </div>

                        <div>
                            {/* Fit Score Box */}
                            <div style={{
                                background: 'linear-gradient(135deg, #F8F9FA 0%, #E1E8ED 100%)',
                                padding: 'var(--spacing-lg)',
                                borderRadius: 'var(--radius-lg)',
                                textAlign: 'center',
                                marginBottom: 'var(--spacing-lg)'
                            }}>
                                <h4 style={{ color: '#636E72', marginBottom: 'var(--spacing-sm)' }}>Mortgage Moment Score</h4>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: 'bold',
                                    color: '#2D3436',
                                    marginBottom: 'var(--spacing-xs)'
                                }}>
                                    {fitScore}/100
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#636E72' }}>
                                    Excellent fit for your profile!
                                </p>
                            </div>

                            {/* Email Button */}
                            <div style={{ textAlign: 'center' }}>
                                {!userEmail ? (
                                    <div style={{ padding: 'var(--spacing-md)', background: '#fff3cd', color: '#856404', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                                        Enter your email on the landing page to receive property details
                                    </div>
                                ) : emailSent ? (
                                    <div style={{ padding: 'var(--spacing-md)', background: '#e8f5e9', color: '#2e7d32', borderRadius: 'var(--radius-md)' }}>
                                        Email sent successfully to {userEmail}!
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleEmail}
                                        disabled={sending}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: 'var(--spacing-md)' }}
                                    >
                                        {sending ? 'Sending...' : 'Email Me About This Property'}
                                    </button>
                                )}
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
                                    Powered by Brevo
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyDetailPage;
