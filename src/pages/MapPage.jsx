
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';


const containerStyle = {
    width: '100%',
    height: '50vh'
};

const defaultCenter = {
    lat: 48.1374,
    lng: 11.5755
};

// Grey/White Google Maps Theme
const mapStyles = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#bdbdbd" }]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#dadada" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#c9c9c9" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    }
];

// Clustering options for better performance
const clusterOptions = {
    minimumClusterSize: 3,
    maxZoom: 15,
    gridSize: 60,
    averageCenter: true,
    zoomOnClick: true
};

// Maximum markers to display on map for performance
const MAX_MAP_MARKERS = 500;

// Marker icons
const affordableIcon = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
const unaffordableIcon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";

const defaultFormData = {
    income: 0,
    rent: 0,
    equity: 0,
    interestRate: 3.5,
    repaymentRate: 2.0
};

const MapPage = () => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_MAPS_API_KEY
    });

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const locationQuery = searchParams.get('location') || 'Munich';

    // Get form data from navigation state or use defaults
    // Memoize to prevent infinite loops in useEffect
    const formData = useMemo(() => {
        return location.state?.formData || defaultFormData;
    }, [location.state]);

    const [properties, setProperties] = useState([]);
    const [filteredProperties, setFilteredProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [maxBudget, setMaxBudget] = useState(0);
    const [budgetDetails, setBudgetDetails] = useState(null);
    const [showBudgetModal, setShowBudgetModal] = useState(false);

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(12);

    // Calculate Max Budget (Local Fallback)
    useEffect(() => {
        if (formData.income) {
            const monthlyNetIncome = parseFloat(formData.income);
            const equity = parseFloat(formData.equity) || 0;
            const interestRate = parseFloat(formData.interestRate) || 3.5;
            const repaymentRate = parseFloat(formData.repaymentRate) || 2.0;

            // Logic: Max monthly rate = 35% of net income (conservative estimate)
            const maxMonthlyRate = monthlyNetIncome * 0.35;

            // Max Loan Amount = (Monthly Rate * 12) / (Interest + Repayment)%
            const annualRate = (interestRate + repaymentRate) / 100;
            const maxLoanAmount = (maxMonthlyRate * 12) / annualRate;

            // Purchasing costs (approx 10% for Notary, Tax, Agent)
            const purchasingCostFactor = 0.10;

            // Max Purchase Price = (Max Loan + Equity) / (1 + Purchasing Costs)
            const calculatedMaxBudget = (maxLoanAmount + equity) / (1 + purchasingCostFactor);

            setMaxBudget(Math.floor(calculatedMaxBudget));
        }
    }, [formData]);

    const [mapCenter, setMapCenter] = useState(defaultCenter);

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                // Construct query parameters
                const params = new URLSearchParams();
                // Use the locally calculated maxBudget for the initial API call
                // if (maxBudget > 0) params.append('maxPrice', maxBudget);
                if (locationQuery) params.append('location', locationQuery);
                if (formData.income) params.append('income', formData.income);
                if (formData.equity) params.append('equity', formData.equity);
                // Do NOT pass rent as debts, as mortgage replaces rent
                // if (formData.rent) params.append('debts', formData.rent); 

                const response = await fetch(`/api/properties?${params.toString()}`);
                const result = await response.json();

                // Server now returns mapped data
                setProperties(result.data);
                setFilteredProperties(result.data);

                // Set Budget Details from API
                if (result.affordabilityOptions) {
                    // Merge the inner budgetDetails (if it exists) with the outer affordabilityOptions
                    // so that both 'scoringResult' (from inner) and 'coach' (from outer) are accessible.
                    const options = result.affordabilityOptions;
                    const combined = {
                        ...options,
                        ...(options.budgetDetails || {})
                    };
                    setBudgetDetails(combined);

                    // Update maxBudget state to match API if we want to sync them
                    if (combined.scoringResult && combined.scoringResult.priceBuilding !== maxBudget) {
                        setMaxBudget(Math.floor(combined.scoringResult.priceBuilding));
                    }
                } else {
                    setBudgetDetails(null); // Clear budget details if not provided by API
                }

                // Geocode the search location to center the map
                if (window.google && locationQuery) {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ address: locationQuery }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            setMapCenter(results[0].geometry.location);
                        } else {
                            // Fallback: if properties found, center on first property
                            if (result.data.length > 0 && result.data[0].address) {
                                setMapCenter({ lat: result.data[0].address.lat, lng: result.data[0].address.lon });
                            }
                        }
                    });
                } else if (result.data.length > 0 && result.data[0].address) {
                    setMapCenter({ lat: result.data[0].address.lat, lng: result.data[0].address.lon });
                }

            } catch (error) {
                console.error("Error loading properties:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [locationQuery, maxBudget, formData, isLoaded]); // Added isLoaded to ensure google object is available

    // Removed client-side filtering useEffect since we now filter on the server
    // But we might want to keep setFilteredProperties if we add other client-side filters later.
    // For now, we set it directly in fetchProperties.

    // Memoize map markers to prevent unnecessary re-renders
    const mapMarkers = useMemo(() => {
        // Limit markers for performance
        const limitedProperties = filteredProperties.slice(0, MAX_MAP_MARKERS);
        return limitedProperties;
    }, [filteredProperties]);

    const handlePropertyClick = (property) => {
        navigate(`/property/${property.id}`, { state: { property, formData } });
    };

    const loadMore = () => {
        setVisibleCount(prev => prev + 12);
    };

    if (loadError) return <div>Error loading maps</div>;
    if (!isLoaded) return <div>Loading maps...</div>;

    return (
        <div className="map-page">
            <div style={{ height: '50vh', width: '100%', position: 'relative' }}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenter}
                    zoom={12}
                    options={{ styles: mapStyles }}
                >
                    <MarkerClusterer options={clusterOptions}>
                        {(clusterer) => (
                            <>
                                {mapMarkers.map(property => (
                                    <Marker
                                        key={property.id}
                                        position={{ lat: property.address.lat, lng: property.address.lon }}
                                        clusterer={clusterer}
                                        onClick={() => setSelectedProperty(property)}
                                        icon={property.affordability ? (property.affordability.isAffordable ? affordableIcon : unaffordableIcon) : undefined}
                                    />
                                ))}
                            </>
                        )}
                    </MarkerClusterer>

                    {selectedProperty && selectedProperty.address && (
                        <InfoWindow
                            position={{ lat: selectedProperty.address.lat, lng: selectedProperty.address.lon }}
                            onCloseClick={() => setSelectedProperty(null)}
                        >
                            <div style={{ padding: '5px', cursor: 'pointer' }} onClick={() => handlePropertyClick(selectedProperty)}>
                                <h4 style={{ margin: '0 0 5px' }}>{selectedProperty.title}</h4>
                                <p style={{ margin: 0 }}>€{selectedProperty.buyingPrice.toLocaleString()}</p>
                                {selectedProperty.affordability && (
                                    <p style={{
                                        margin: '5px 0 0',
                                        color: selectedProperty.affordability.isAffordable ? '#27ae60' : '#e74c3c',
                                        fontWeight: 'bold'
                                    }}>
                                        {selectedProperty.affordability.isAffordable ? 'Affordable' : 'Over Budget'}
                                    </p>
                                )}
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </div>

            <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                    <h2 style={{ margin: 0 }}>Properties in {locationQuery} ({filteredProperties.length})</h2>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        {filteredProperties.length > MAX_MAP_MARKERS && (
                            <div style={{
                                background: '#E1E8ED',
                                color: '#636E72',
                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.85rem'
                            }}>
                                Showing {MAX_MAP_MARKERS} of {filteredProperties.length} on map
                            </div>
                        )}
                        {(maxBudget > 0 || budgetDetails) && (
                            <div
                                onClick={() => budgetDetails && budgetDetails.scoringResult && setShowBudgetModal(true)}
                                style={{
                                    background: filteredProperties.some(p => p.affordability && p.affordability.isAffordable) ? '#27ae60' : '#e74c3c',
                                    color: 'white',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    cursor: (budgetDetails && budgetDetails.scoringResult) ? 'pointer' : 'default'
                                }}
                            >
                                Max Budget: €{(budgetDetails && budgetDetails.scoringResult) ? Math.floor(budgetDetails.scoringResult.priceBuilding).toLocaleString() : maxBudget.toLocaleString()}
                                {budgetDetails && budgetDetails.scoringResult && <span style={{ marginLeft: '5px', fontSize: '0.8rem' }}>ℹ️</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Budget Details Modal */}
                {showBudgetModal && budgetDetails && budgetDetails.scoringResult && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                    }} onClick={() => setShowBudgetModal(false)}>
                        <div style={{
                            backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto'
                        }} onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginTop: 0 }}>Affordability Report</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                <div><strong>Max Property Price:</strong></div>
                                <div>€{budgetDetails.scoringResult.priceBuilding.toLocaleString()}</div>

                                <div><strong>Max Loan Amount:</strong></div>
                                <div>€{budgetDetails.scoringResult.loanAmount.toLocaleString()}</div>

                                <div><strong>Equity Used:</strong></div>
                                <div>€{budgetDetails.scoringResult.equityCash.toLocaleString()}</div>

                                <div><strong>Monthly Payment:</strong></div>
                                <div>€{budgetDetails.scoringResult.monthlyPayment.toLocaleString()}</div>

                                <div><strong>Interest Rate:</strong></div>
                                <div>{budgetDetails.scoringResult.effectiveInterest}%</div>
                            </div>

                            <h3>Additional Costs</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>Notary ({budgetDetails.additionalCosts.additionalCostsPercentage.notary}%):</div>
                                <div>€{budgetDetails.additionalCosts.additionalCostsValue.notary.toLocaleString()}</div>

                                <div>Tax ({budgetDetails.additionalCosts.additionalCostsPercentage.tax}%):</div>
                                <div>€{budgetDetails.additionalCosts.additionalCostsValue.tax.toLocaleString()}</div>

                                <div>Broker ({budgetDetails.additionalCosts.additionalCostsPercentage.broker}%):</div>
                                <div>€{budgetDetails.additionalCosts.additionalCostsValue.broker.toLocaleString()}</div>
                            </div>

                            <button
                                onClick={() => setShowBudgetModal(false)}
                                style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <p>Loading properties...</p>
                ) : (
                    <>
                        {/* Affordability Coach - Show when no affordable properties found */}
                        {budgetDetails && filteredProperties.filter(p => p.affordability && p.affordability.isAffordable).length === 0 && (
                            <div style={{
                                background: '#fff',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--spacing-lg)',
                                marginBottom: 'var(--spacing-xl)',
                                border: '1px solid #e0e0e0',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <h2 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                                    Affordability Coach 🏠
                                </h2>
                                <p style={{ fontSize: '1.1rem', color: '#555' }}>
                                    It looks like the properties in this area are currently out of reach. Don't worry, here is your personalized plan to bridge the gap.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-lg)' }}>

                                    {/* Reality Check */}
                                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #e74c3c' }}>
                                        <h3 style={{ marginTop: 0, color: '#c0392b' }}>The Reality Check</h3>
                                        <p>You are currently <strong>€{budgetDetails.option1?.gap?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> short for the cheapest property here.</p>
                                        <p style={{ fontSize: '0.9rem', color: '#666' }}>In 5 years, prices here might rise to €{budgetDetails.option1?.futurePrice5Years?.toLocaleString()}.</p>
                                    </div>

                                    {/* Plan A: Income */}
                                    <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
                                        <h3 style={{ marginTop: 0, color: '#2980b9' }}>Plan A: Boost Income</h3>
                                        <p>To afford a home here, you would need a net monthly income of approximately:</p>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50', margin: '10px 0' }}>
                                            €{budgetDetails.coach?.requiredIncome?.toLocaleString()}
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                            That's an increase of <strong>€{budgetDetails.coach?.incomeGap?.toLocaleString()}</strong> per month.
                                        </p>
                                    </div>

                                    {/* Plan B: Generational Wealth */}
                                    <div style={{ background: '#f0fff4', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #27ae60' }}>
                                        <h3 style={{ marginTop: 0, color: '#27ae60' }}>Plan B: For Your Children</h3>
                                        <p>Invest in an ETF to help your children buy here in 18 years.</p>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50', margin: '10px 0' }}>
                                            €{budgetDetails.coach?.monthlySavingsForChildren?.toLocaleString()} / month
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                            Assuming 7% annual return, this could grow to cover the future down payment.
                                        </p>
                                    </div>
                                </div>

                                {/* Plan C: Alternative Locations */}
                                <div style={{ marginTop: 'var(--spacing-xl)' }}>
                                    <h3 style={{ color: '#2c3e50' }}>Plan C: Where you can buy right now</h3>
                                    <p>Based on your current budget, you could comfortably afford a home in these growing cities:</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                                        {budgetDetails.alternativeLocations?.map((loc, index) => (
                                            <div
                                                key={index}
                                                onClick={() => {
                                                    // Update URL and trigger search
                                                    const newParams = new URLSearchParams(searchParams);
                                                    newParams.set('location', loc.name);
                                                    navigate(`/map?${newParams.toString()}`, { state: { formData } });
                                                }}
                                                style={{
                                                    padding: '15px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                    background: 'white'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
                                            >
                                                <h4 style={{ margin: '0 0 5px', color: '#2c3e50' }}>{loc.name}</h4>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#27ae60', fontWeight: 'bold' }}>Avg. €{loc.avgPrice.toLocaleString()}</p>
                                                <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#7f8c8d' }}>{loc.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Call Momo Button */}
                                <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                    <p style={{ marginBottom: '15px', color: '#666' }}>Need more personalized advice? Talk to our AI Mortgage Expert.</p>
                                    <button
                                        disabled
                                        style={{
                                            background: '#bdc3c7',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 24px',
                                            borderRadius: '50px',
                                            fontSize: '1rem',
                                            fontWeight: 'bold',
                                            cursor: 'not-allowed',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <span>📞</span> Call Momo (Coming Soon)
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                            {filteredProperties
                                .slice(0, visibleCount)
                                .map(property => (
                                    <div key={property.id} className="card" onClick={() => handlePropertyClick(property)} style={{
                                        cursor: 'pointer',
                                        border: property.affordability ? (property.affordability.isAffordable ? '2px solid #27ae60' : '2px solid #e74c3c') : '1px solid #eee',
                                        position: 'relative'
                                    }}>
                                        {property.affordability && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '10px',
                                                background: property.affordability.isAffordable ? '#27ae60' : '#e74c3c',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 'bold',
                                                zIndex: 1
                                            }}>
                                                {property.affordability.isAffordable ? 'Affordable' : 'Over Budget'}
                                            </div>
                                        )}
                                        {property.images && property.images.length > 0 ? (
                                            <img
                                                src={property.images[0].originalUrl}
                                                alt={property.title}
                                                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-sm)' }}
                                                onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=No+Image' }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '200px', background: '#eee', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                No Image
                                            </div>
                                        )}
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-xs)' }}>{property.title}</h3>
                                        <p style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                            €{property.buyingPrice.toLocaleString()}
                                        </p>
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                            {property.address.street}, {property.address.postcode} {property.address.city}
                                        </p>
                                        <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                                            <span style={{ background: '#E1E8ED', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                {property.rooms} Rooms
                                            </span>
                                            <span style={{ background: '#E1E8ED', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                                {property.squareMeter} m²
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {visibleCount < filteredProperties.length && (
                            <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)' }}>
                                <button onClick={loadMore} className="btn btn-primary">
                                    Load More
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MapPage;
