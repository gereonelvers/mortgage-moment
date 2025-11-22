import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import CallScreen from '../components/CallScreen';
import { useRealtimeVoice } from '../hooks/useRealtimeVoice';


const PropertyDetailPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [displayProperty, setDisplayProperty] = useState(location.state?.property || null);
    const [loading, setLoading] = useState(!location.state?.property);
    const [emailSent, setEmailSent] = useState(false);
    const [sending, setSending] = useState(false);

    // Extended user profile state with sessionStorage persistence
    const getInitialProfile = () => {
        const savedProfile = sessionStorage.getItem(`userProfile_${id}`);
        if (savedProfile) {
            try {
                return JSON.parse(savedProfile);
            } catch (e) {
                console.error('Error parsing saved profile:', e);
            }
        }
        return {
            name: location.state?.formData?.name || '',
            email: location.state?.formData?.email || '',
            income: location.state?.formData?.income || '',
            rent: location.state?.formData?.rent || '',
            equity: location.state?.formData?.equity || '0',
            employmentStatus: '', // New field
            age: '', // New field
            monthlyDebts: '0' // New field
        };
    };

    const [userProfile, setUserProfile] = useState(getInitialProfile);

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [affordabilityResult, setAffordabilityResult] = useState(null);

    // Persist profile to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem(`userProfile_${id}`, JSON.stringify(userProfile));
    }, [userProfile, id]);

    // Calculate completeness score
    const calculateCompleteness = () => {
        const fields = ['name', 'email', 'income', 'rent', 'equity', 'employmentStatus', 'age', 'monthlyDebts'];
        const filledFields = fields.filter(field => {
            const value = userProfile[field];
            return value && value.toString().trim() !== '' && value.toString() !== '0';
        });
        return Math.round((filledFields.length / fields.length) * 100);
    };

    const completenessScore = calculateCompleteness();

    // Callback for AI to update user profile
    const updateUserProfile = (field, value) => {
        console.log(`Updating profile: ${field} = ${value}`);
        setUserProfile(prev => {
            const newProfile = { ...prev, [field]: value };
            // Trigger affordability check with new profile
            // We need to do this after state update, or call it directly with new profile
            // Since checkAffordability uses state, we'll rely on useEffect or pass args
            return newProfile;
        });
        return true;
    };

    // Callback for AI to check affordability
    const checkAffordability = async (currentProfile = userProfile) => {
        try {
            const response = await axios.post('/api/calculate-affordability', {
                income: currentProfile.income,
                rent: currentProfile.rent,
                equity: currentProfile.equity,
                employmentStatus: currentProfile.employmentStatus,
                age: currentProfile.age,
                monthlyDebts: currentProfile.monthlyDebts,
                propertyPrice: displayProperty.buyingPrice.toLocaleString()
            });
            setAffordabilityResult(response.data);
            return response.data;
        } catch (error) {
            console.error('Error checking affordability:', error);
            return { error: 'Failed to calculate affordability' };
        }
    };

    // Trigger affordability check when profile changes
    useEffect(() => {
        if (displayProperty) {
            checkAffordability();
        }
    }, [userProfile, displayProperty]);


    useEffect(() => {
        if (!displayProperty) {
            const fetchProperty = async () => {
                try {
                    // Fetch property from API
                    const response = await axios.get('/properties.min.json'); // Assuming this endpoint returns all properties
                    const data = response.data;
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
        if (!userProfile.email) {
            alert('Please enter your email address on the landing page first.');
            return;
        }

        setSending(true);

        try {
            // Prepare coach data if available
            const coachData = affordabilityResult?.budgetDetails?.coach ? {
                gap: affordabilityResult.gap,
                futurePrice5Years: affordabilityResult.budgetDetails.option1?.futurePrice5Years,
                requiredIncome: affordabilityResult.budgetDetails.coach.requiredIncome,
                incomeGap: affordabilityResult.budgetDetails.coach.incomeGap,
                monthlySavingsForChildren: affordabilityResult.budgetDetails.coach.monthlySavingsForChildren,
                projectedChildSavings: affordabilityResult.budgetDetails.coach.projectedChildSavings,
                targetDownPayment: affordabilityResult.budgetDetails.coach.targetDownPayment
            } : null;

            const response = await axios.post('/api/send-email', {
                userName: userProfile.name,
                userEmail: userProfile.email,
                propertyTitle: displayProperty.title,
                propertyAddress: `${displayProperty.address.street}, ${displayProperty.address.city} `,
                propertyPrice: displayProperty.buyingPrice.toLocaleString(),
                propertyImage: displayProperty.images && displayProperty.images.length > 0 ? displayProperty.images[0].originalUrl : null,
                coachData: coachData,
                isVoiceCall: true // Assume true if triggered via this flow, or we can make it dynamic
            });
            console.log('Email sent successfully! Response:', response);
            setEmailSent(true);
            return true; // Return success for AI
        } catch (error) {
            console.error("Error sending email:", error);
            console.error("Error details:", error.response?.data);
            alert(`Failed to send email: ${error.response?.data?.message || error.message} `);
            return false; // Return failure for AI
        } finally {
            setSending(false);
        }
    };

    const { startCall, stopCall, status, isMuted, toggleMute } = useRealtimeVoice(displayProperty, userProfile, handleEmail, updateUserProfile, checkAffordability);

    return (
        <div className="property-detail-page" style={{ paddingBottom: 'var(--spacing-xl)' }}>
            <CallScreen status={status} onHangup={stopCall} isMuted={isMuted} onToggleMute={toggleMute} />
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
                {/* Back Button */}
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
                        justifyContent: 'center',
                        fontSize: '1.2rem'
                    }}
                >
                    ←
                </button>

                {/* Action Buttons */}
                <div style={{
                    position: 'absolute',
                    top: 'var(--spacing-md)',
                    right: 'var(--spacing-md)',
                    display: 'flex',
                    gap: 'var(--spacing-sm)'
                }}>
                    {/* Email Button */}
                    {userProfile.email && !emailSent && (
                        <button
                            onClick={handleEmail}
                            disabled={sending}
                            title="Email me about this property"
                            style={{
                                background: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                boxShadow: 'var(--shadow-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: sending ? 0.5 : 1
                            }}
                        >
                            {sending ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#636E72" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D3436" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            )}
                        </button>
                    )}

                    {emailSent && (
                        <div style={{
                            background: '#28a745',
                            color: 'white',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-md)'
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    )}

                    {/* Call AI Button */}
                    <button
                        onClick={status === 'connected' || status === 'connecting' ? stopCall : startCall}
                        title={status === 'connected' ? "End Call" : "Call Momo"}
                        style={{
                            background: status === 'connected' ? '#e74c3c' : (status === 'connecting' ? '#f39c12' : '#3498db'), // Red if connected, Orange if connecting, Blue if idle
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.3s'
                        }}
                    >
                        {status === 'connected' ? (
                            <span style={{ fontSize: '1.2rem' }}>🟥</span>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        )}
                    </button>
                </div>
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
                            </p >
                        </div >
                    </div >
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                        {/* Profile Completeness Widget */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--spacing-md)',
                            background: completenessScore < 100 ? '#fff3cd' : '#d4edda',
                            borderRadius: 'var(--border-radius)',
                            marginBottom: 'var(--spacing-md)',
                            cursor: completenessScore < 100 ? 'pointer' : 'default'
                        }}
                            onClick={() => completenessScore < 100 && setShowProfileModal(true)}>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                    Profile Completeness: {completenessScore}%
                                </h4>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#e0e0e0',
                                    borderRadius: '4px',
                                    marginTop: '0.5rem',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${completenessScore}%`,
                                        height: '100%',
                                        background: completenessScore < 100 ? '#ffc107' : '#28a745',
                                        transition: 'width 0.3s ease'
                                    }}></div>
                                </div>
                                {completenessScore < 100 && (
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                                        Click to add more details for a better assessment
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Profile Update Modal */}
                        {showProfileModal && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000
                            }}
                                onClick={() => setShowProfileModal(false)}>
                                <div style={{
                                    background: 'white',
                                    padding: 'var(--spacing-lg)',
                                    borderRadius: 'var(--border-radius)',
                                    maxWidth: '500px',
                                    width: '90%',
                                    maxHeight: '80vh',
                                    overflowY: 'auto'
                                }}
                                    onClick={(e) => e.stopPropagation()}>
                                    <h3 style={{ marginTop: 0 }}>Update Your Profile</h3>

                                    <div className="input-group">
                                        <label className="input-label">Employment Status</label>
                                        <select
                                            className="input-field"
                                            value={userProfile.employmentStatus}
                                            onChange={(e) => setUserProfile(prev => ({ ...prev, employmentStatus: e.target.value }))}>
                                            <option value="">Select...</option>
                                            <option value="employed">Employed</option>
                                            <option value="self-employed">Self-Employed</option>
                                            <option value="unemployed">Unemployed</option>
                                            <option value="retired">Retired</option>
                                        </select>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Age</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="30"
                                            value={userProfile.age}
                                            onChange={(e) => setUserProfile(prev => ({ ...prev, age: e.target.value }))}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Monthly Debts (€)</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="0"
                                            value={userProfile.monthlyDebts}
                                            onChange={(e) => setUserProfile(prev => ({ ...prev, monthlyDebts: e.target.value }))}
                                        />
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
                                        onClick={() => setShowProfileModal(false)}>
                                        Save
                                    </button>
                                </div>
                            </div>
                        )}

                        <h3>Property Details</h3>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-lg) 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                        {/* Description */}
                        <div>
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>About This Property</h3>
                            <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                                This {displayProperty.rooms}-room property offers {displayProperty.squareMeter}m² of living space
                                in {displayProperty.address.city}. Located on floor {displayProperty.floor || 0}, this property is
                                listed at €{displayProperty.buyingPrice.toLocaleString()}.
                            </p>
                        </div>

                        {/* Mortgage Moment Score */}
                        <div style={{
                            background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--border-radius)',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <h4 style={{ color: 'white', marginBottom: 'var(--spacing-sm)', opacity: 0.9 }}>Mortgage Moment Score</h4>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>
                                {fitScore}
                            </div>
                            <p style={{ fontSize: '0.9rem', margin: 0, opacity: 0.9 }}>
                                Great match for your budget!
                            </p>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default PropertyDetailPage;
