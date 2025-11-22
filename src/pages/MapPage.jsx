
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

const MapPage = () => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_MAPS_API_KEY
    });

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const locationQuery = searchParams.get('location') || 'Munich';

    // Get form data from navigation state or use defaults
    const formData = location.state?.formData || {
        income: 0,
        rent: 0,
        equity: 0,
        interestRate: 3.5,
        repaymentRate: 2.0
    };

    const [properties, setProperties] = useState([]);
    const [filteredProperties, setFilteredProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [maxBudget, setMaxBudget] = useState(0);

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(12);

    // Calculate Max Budget
    useEffect(() => {
        if (formData.income) {
            const monthlyNetIncome = parseFloat(formData.income);
            const equity = parseFloat(formData.equity) || 0;
            const interestRate = parseFloat(formData.interestRate) || 3.5;
            const repaymentRate = parseFloat(formData.repaymentRate) || 2.0;

            // Logic: Max monthly rate = 40% of net income
            const maxMonthlyRate = monthlyNetIncome * 0.40;

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

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await fetch('/properties.min.json');
                const data = await response.json();

                // Map minified data to full structure
                const validProperties = data.map(item => ({
                    id: item.id,
                    title: item.t,
                    address: {
                        lat: item.lat,
                        lon: item.lng,
                        street: item.l,
                        postcode: item.pc,
                        city: item.c
                    },
                    buyingPrice: item.p,
                    pricePerSqm: item.s ? Math.round(item.p / item.s) : 0,
                    rooms: item.r,
                    squareMeter: item.s,
                    images: item.imgs.map(url => ({ originalUrl: url })),
                    floor: 0
                }));

                setProperties(validProperties);
            } catch (error) {
                console.error("Error loading properties:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [locationQuery]);

    // Apply filtering
    useEffect(() => {
        const filtered = properties.filter(p => maxBudget === 0 || p.buyingPrice <= maxBudget);
        setFilteredProperties(filtered);
        setVisibleCount(12); // Reset pagination on filter change
    }, [properties, maxBudget]);

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
                    center={filteredProperties.length > 0 && filteredProperties[0].address ? { lat: filteredProperties[0].address.lat, lng: filteredProperties[0].address.lon } : defaultCenter}
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
                        {maxBudget > 0 && (
                            <div style={{
                                background: 'var(--color-text-secondary)',
                                color: 'white',
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.9rem',
                                fontWeight: 'bold'
                            }}>
                                Max Budget: €{maxBudget.toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <p>Loading properties...</p>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                            {filteredProperties
                                .slice(0, visibleCount)
                                .map(property => (
                                    <div key={property.id} className="card" onClick={() => handlePropertyClick(property)} style={{ cursor: 'pointer' }}>
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
        </div >
    );
};

export default MapPage;
