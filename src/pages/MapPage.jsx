import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const containerStyle = {
    width: '100%',
    height: '50vh'
};

const defaultCenter = {
    lat: 48.1374,
    lng: 11.5755
};

const MapPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const locationQuery = searchParams.get('location') || 'Munich';

    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await axios.post('https://thinkimmo-api.mgraetz.de/thinkimmo', {
                    active: true,
                    type: "APPARTMENTBUY",
                    sortBy: "desc",
                    sortKey: "pricePerSqm",
                    from: 0,
                    size: 20,
                    geoSearches: {
                        geoSearchQuery: locationQuery,
                        geoSearchType: "city"
                        // region: "BY" - Removed to allow searching other cities
                    }
                });

                if (response.data && response.data.results) {
                    setProperties(response.data.results);
                }
            } catch (error) {
                console.error("Error fetching properties:", error);
                // Fallback to mock data
                setProperties([
                    {
                        id: 'mock-1',
                        title: 'Modern Apartment in City Center',
                        address: { lat: 48.1374, lon: 11.5755, street: 'Marienplatz 1', postcode: '80331', city: 'München' },
                        buyingPrice: 450000,
                        pricePerSqm: 8181,
                        rooms: 2,
                        squareMeter: 55,
                        images: [{ originalUrl: 'https://placehold.co/600x400?text=Living+Room' }]
                    },
                    {
                        id: 'mock-2',
                        title: 'Spacious Family Home',
                        address: { lat: 48.1400, lon: 11.5800, street: 'Maximilianstraße 10', postcode: '80539', city: 'München' },
                        buyingPrice: 850000,
                        pricePerSqm: 9500,
                        rooms: 4,
                        squareMeter: 90,
                        images: [{ originalUrl: 'https://placehold.co/600x400?text=Exterior' }]
                    },
                    {
                        id: 'mock-3',
                        title: 'Cozy Studio',
                        address: { lat: 48.1350, lon: 11.5700, street: 'Sendlinger Str. 5', postcode: '80331', city: 'München' },
                        buyingPrice: 320000,
                        pricePerSqm: 8000,
                        rooms: 1,
                        squareMeter: 40,
                        images: [{ originalUrl: 'https://placehold.co/600x400?text=Studio' }]
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [locationQuery]);

    const handlePropertyClick = (property) => {
        navigate(`/property/${property.id}`, { state: { property } });
    };

    return (
        <div className="map-page">
            <div style={{ height: '50vh', width: '100%', position: 'relative' }}>
                <LoadScript googleMapsApiKey={import.meta.env.VITE_MAPS_API_KEY}>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={properties.length > 0 && properties[0].address ? { lat: properties[0].address.lat, lng: properties[0].address.lon } : defaultCenter}
                        zoom={12}
                    >
                        {/* Mock Heatmap Overlay (Visual only for now) */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            pointerEvents: 'none',
                            background: 'radial-gradient(circle at 50% 50%, rgba(255, 107, 107, 0.2), transparent 70%)',
                            zIndex: 0
                        }} />

                        {properties.map(property => (
                            property.address && (
                                <Marker
                                    key={property.id}
                                    position={{ lat: property.address.lat, lng: property.address.lon }}
                                    onClick={() => setSelectedProperty(property)}
                                />
                            )
                        ))}

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
                </LoadScript>
            </div>

            <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Properties in {locationQuery}</h2>

                {loading ? (
                    <p>Loading properties...</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {properties.map(property => (
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
                                    <span style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        {property.rooms} Rooms
                                    </span>
                                    <span style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                        {property.squareMeter} m²
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapPage;
