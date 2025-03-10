import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import "../../public/ALL CSS/leaflet.css"

const Map = () => {
  return (
    <>
    <div className="container">
        <form>
            <input type="text" placeholder="Enter location" />
            <input type="datetime-local" />
            <input type="datetime-local" />
            <button type="button">Search</button>
        </form>
        <div className="map-container">
            <MapContainer
                center={[17.385, 78.4867]} // Coordinates for Hyderabad, India
                zoom={13}
                style={{ height: '400px', width: '100%' }}
            >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[17.385, 78.4867]}>
                <Popup>
            Sample Location <br /> Hyderabad, India.
            </Popup>
            </Marker>
            </MapContainer>
        </div>
    </div>
    </>
  );
};

export default Map;