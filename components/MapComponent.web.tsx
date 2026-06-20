import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect } from 'react';
import { Marker as LeafletMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';

// Fix for default marker icons in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapEvents = ({ onPress, onRegionChangeComplete }: any) => {
  const map = useMapEvents({
    click(e) {
      if (onPress) {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: e.latlng.lat,
              longitude: e.latlng.lng,
            }
          }
        });
      }
    },
    moveend() {
      if (onRegionChangeComplete) {
        const center = map.getCenter();
        onRegionChangeComplete({
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    }
  });
  return null;
};

const MapController = ({ region }: any) => {
  const map = useMap();
  useEffect(() => {
    if (region && region.latitude && region.longitude) {
      map.setView([region.latitude, region.longitude], map.getZoom() || 13);
    }
  }, [region?.latitude, region?.longitude, map]);
  return null;
};

export default function MapView(props: any) {
  const center = props.region
    ? [props.region.latitude, props.region.longitude]
    : [20.5937, 78.9629];

  return (
    <View style={[styles.container, props.style]}>
      <MapContainer
        center={center as any}
        zoom={13}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onPress={props.onPress} onRegionChangeComplete={props.onRegionChangeComplete} />
        <MapController region={props.region} />
        {props.children}
      </MapContainer>
    </View>
  );
}

export const Marker = (props: any) => {
  if (!props.coordinate) return null;
  return (
    <LeafletMarker position={[props.coordinate.latitude, props.coordinate.longitude]} />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  }
});

// note : this component is a web implementation of the mapview component using leaflet and recat-leaflet library.it is designened to be used in a react native web project and it provides basic functionalitites like displaying a map,adding markers and handling map events like onpress and onregionchnmage complement . the component uses leaflet for map rendereing and react-leaflet for integrating leaflet with react. it also includes a fix for default marker icons in leaflet to ensure they display coorectly in a web envirnonment . the map 