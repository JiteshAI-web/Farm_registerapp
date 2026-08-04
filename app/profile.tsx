import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Platform, RefreshControl, StatusBar as RNStatusBar, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from '../components/MapComponent';



const InputField = ({
  label,
  required = true,
  value,
  onChangeText
}: {
  label: string,
  required?: boolean,
  value?: string,
  onChangeText?: (text: string) => void
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <TextInput
      style={styles.input}
      selectionColor="#333"
      value={value}
      onChangeText={onChangeText}
    />
  </View>
);

const DropdownBox = ({
  label,
  value,
  onSelect,
  max = 10,
  disabled = false,
  items
}: {
  label: string,
  value: string,
  onSelect?: (val: string) => void,
  max?: number,
  disabled?: boolean,
  items?: string[]
}) => {
  const [open, setOpen] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);

  const openDropdown = () => {
    if (disabled) return;
    triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setDropdownLayout({ top: pageY + height, left: pageX, width });
      setOpen(true);
    });
  };

  const getDisplayValue = () => {
    const num = parseInt(value);
    if (!isNaN(num) && num < 10 && !value.includes('Cluster')) {
      return `0${num}`;
    }
    return value;
  };

  const menuItems = items || [...Array(max + 1).keys()].map(num => num.toString());

  return (
    <View style={styles.dropdownRow}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity style={[styles.dropdownBox, disabled && { opacity: 0.7 }]} onPress={openDropdown} activeOpacity={disabled ? 1 : 0.7}>
          <Text style={styles.dropdownValue}>{getDisplayValue()}</Text>
          <Ionicons name="caret-down-outline" size={16} color="#333" />
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownBackdrop} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={[styles.dropdownMenu, { position: 'absolute', top: dropdownLayout.top + 4, left: dropdownLayout.left, minWidth: Math.max(80, dropdownLayout.width) }]} onStartShouldSetResponder={() => true}>
            <ScrollView>
              {menuItems.map((itemVal, idx) => {
                const isSelected = value === itemVal;
                const num = parseInt(itemVal);
                const displayStr = (!isNaN(num) && num < 10 && !itemVal.includes('Cluster'))
                  ? `0${num}`
                  : itemVal;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dropdownMenuItem, isSelected && { backgroundColor: '#0088FF' }]}
                    onPress={() => { if (onSelect) onSelect(itemVal); setOpen(false); }}
                  >
                    <Text style={[styles.dropdownMenuItemText, isSelected && { color: '#fff', fontWeight: '600' }]}>{displayStr}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const WhiteBoxInput = ({ label, required = true, value, onChangeText, editable = true }: { label: string, required?: boolean, value?: string, onChangeText?: (text: string) => void, editable?: boolean }) => {
  const [focused, setFocused] = useState(false);
  const [internalText, setInternalText] = useState('');

  const isControlled = value !== undefined;
  const currentText = isControlled ? value : internalText;

  const showPlaceholder = !focused && currentText.length === 0;

  return (
    <View style={styles.whiteInputWrapper}>
      {showPlaceholder && (
        <View style={styles.fakePlaceholder}>
          <Text style={styles.placeholderText}>{label} </Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
      )}
      <TextInput
        style={styles.inlineTextInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={(t) => {
          if (!isControlled) setInternalText(t);
          if (onChangeText) onChangeText(t);
        }}
        value={currentText}
        editable={editable}
      />
    </View>
  );
};

const PondDetails = ({
  title,
  cIndex,
  pIndex,
  onUpdate,
  initialData
}: {
  title: string;
  cIndex: number;
  pIndex: number;
  onUpdate: (data: { pondid: string; latitude: number; longitude: number; location: string }) => void;
  initialData?: { id?: number; pondid: string; latitude: number; longitude: number; location: string; locationName?: string }
}) => {
  const [mapVisible, setMapVisible] = useState(false);
  const [locationName, setLocationName] = useState(initialData?.locationName || '');
  const [latitude, setLatitude] = useState(initialData?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(initialData?.longitude?.toString() || '');
  const [pondIdInput, setPondIdInput] = useState(initialData?.pondid || `POND00${pIndex + 1}`);
  const [dbPondId, setDbPondId] = useState<number | undefined>(initialData?.id);
  const [selectedDeviceType, setSelectedDeviceType] = useState('Feeding');
  const [generatedDevices, setGeneratedDevices] = useState<string[]>([]);
  const [deviceLoading, setDeviceLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.locationName !== undefined) setLocationName(initialData.locationName);
      if (initialData.latitude !== undefined) setLatitude(initialData.latitude.toString());
      if (initialData.longitude !== undefined) setLongitude(initialData.longitude.toString());
      if (initialData.pondid !== undefined) setPondIdInput(initialData.pondid);
      if (initialData.id !== undefined) setDbPondId(initialData.id);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchExistingDevice = async () => {
      if (dbPondId) {
        try {
          const url = `${process.env.EXPO_PUBLIC_API_URL}/deviceid_view/${dbPondId}/`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const allDevices = data.devices || (Array.isArray(data) ? data : []);
            
            if (Array.isArray(allDevices) && allDevices.length > 0) {
              const ids = allDevices.map((d: any) => d.device_id?.toString() || d?.toString()).filter(Boolean);
              if (ids.length > 0) {
                setGeneratedDevices(ids);
              }
            } else if (data.device_id) {
               setGeneratedDevices([data.device_id.toString()]);
            }
          }
        } catch (error) {
          console.error("Failed to fetch existing device for pond", dbPondId, error);
        }
      }
    };
    fetchExistingDevice();
  }, [dbPondId]);

  useEffect(() => {
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      const delta = 0.0003;
      const poly = `SRID=4326;POLYGON ((${lonNum - delta} ${latNum - delta}, ${lonNum - delta} ${latNum + delta}, ${lonNum + delta} ${latNum + delta}, ${lonNum + delta} ${latNum - delta}, ${lonNum - delta} ${latNum - delta}))`;

      onUpdate({
        pondid: pondIdInput,
        latitude: latNum,
        longitude: lonNum,
        location: poly
      });
    }
  }, [latitude, longitude, pondIdInput]);

  const [tempCoordinate, setTempCoordinate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<any>(null);
  const [currentRegion, setCurrentRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const handleMapPress = (e: any) => {
    setTempCoordinate(e.nativeEvent.coordinate);
  };

  const confirmLocation = async () => {
    if (tempCoordinate) {
      setLatitude(tempCoordinate.latitude.toString());
      setLongitude(tempCoordinate.longitude.toString());

      // Temporary placeholder while fetching
      setLocationName('Fetching address details...');
      setMapVisible(false);

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${tempCoordinate.latitude}&lon=${tempCoordinate.longitude}`, {
          headers: { 'User-Agent': 'FarmApp/1.0' }
        });
        const data = await res.json();
        if (data && data.display_name) {
          setLocationName(data.display_name);
        } else {
          setLocationName(`Lat: ${tempCoordinate.latitude.toFixed(4)}, Lng: ${tempCoordinate.longitude.toFixed(4)}`);
        }
      } catch (error) {
        console.warn('Reverse geocoding failed', error);
        setLocationName(`Lat: ${tempCoordinate.latitude.toFixed(4)}, Lng: ${tempCoordinate.longitude.toFixed(4)}`);
      }
    } else {
      setMapVisible(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      let lat, lon;

      // Try Nominatim (OpenStreetMap) first because it is much better at finding specific ponds and POIs
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'User-Agent': 'FarmApp/1.0' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lon = parseFloat(data[0].lon);
        }
      } catch (osmError) {
        console.warn('OSM search failed, falling back to native geocoder...', osmError);
      }

      // Fallback to native geocoding if OSM didn't find anything
      if (lat === undefined || lon === undefined) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const result = await Location.geocodeAsync(searchQuery);
          if (result && result.length > 0) {
            lat = result[0].latitude;
            lon = result[0].longitude;
          }
        }
      }

      if (lat !== undefined && lon !== undefined) {
        const newRegion = {
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setTempCoordinate({ latitude: lat, longitude: lon });
        setCurrentRegion(newRegion);

        // Animate native map to the new location
        if (mapRef.current && mapRef.current.animateToRegion) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } else {
        Alert.alert('Not Found', 'Could not find that location.');
      }
    } catch (error) {
      console.warn('Geocoding error', error);
      Alert.alert('Error', 'An error occurred while searching for the location. Please check your network connection.');
    }
  };

  const handleGenerateDevice = async () => {
    if (!dbPondId) {
      Alert.alert('Error', 'Please submit and register your pond coordinates first before generating IoT devices.');
      return;
    }

    setDeviceLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/generate_device/`;

      let mappedDeviceType = selectedDeviceType;
      if (selectedDeviceType === 'Farm Eye') {
        mappedDeviceType = 'checktray';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_type: mappedDeviceType,
          pond_id: dbPondId.toString(),
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from server:", text.substring(0, 500));
        Alert.alert('Server Error', 'The server returned an HTML error page. This usually means a backend crash or missing parameters. Check the Metro console logs.');
        return;
      }

      if (response.ok) {
        Alert.alert('Success', `${data.message || 'Device created successfully'}\nDevice ID: ${data.device_id}`);
        if (data.device_id) {
          setGeneratedDevices(prev => [...prev, data.device_id.toString()]);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to create device. Please try again.');
      }
    } catch (error) {
      console.error('Error generating device:', error);
      Alert.alert('Error', 'Network request failed. Please check if the API server is running.');
    } finally {
      setDeviceLoading(false);
    }
  };

  return (
    <View style={styles.nestedGrayBox}>
      <Text style={styles.nestedBoxTitle}>{title}</Text>

      <WhiteBoxInput label="Location" value={locationName} onChangeText={setLocationName} />

      <View style={styles.iconCenter}>
        <TouchableOpacity onPress={() => {
          const lat = parseFloat(latitude);
          const lon = parseFloat(longitude);
          if (!isNaN(lat) && !isNaN(lon)) {
            setTempCoordinate({ latitude: lat, longitude: lon });
            const newRegion = { latitude: lat, longitude: lon, latitudeDelta: 0.005, longitudeDelta: 0.005 };
            setCurrentRegion(newRegion);
          }
          setMapVisible(true);
        }}>
          <Ionicons name="location-outline" size={32} color="#0088FF" />
        </TouchableOpacity>
      </View>

      <WhiteBoxInput label="Latitude" value={latitude} onChangeText={setLatitude} />
      <WhiteBoxInput label="Longitude" value={longitude} onChangeText={setLongitude} />

      <Modal visible={mapVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.mapModalContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapHeaderTitle}>Select Location for {title}</Text>
              <TouchableOpacity onPress={() => setMapVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search Location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                <Ionicons name="search" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <MapView
              ref={mapRef}
              style={styles.mapView}
              mapType="satellite"
              onPress={handleMapPress}
              region={currentRegion}
              onRegionChangeComplete={setCurrentRegion}
            >
              {tempCoordinate && (

                <Marker coordinate={tempCoordinate} />
              )}
            </MapView>

            <View style={styles.mapFooter}>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmLocation}>
                <Text style={styles.confirmBtnText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Device Generation Section */}
      <View style={{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 }}>Provision IoT Device</Text>

        <WhiteBoxInput
          label="Pond ID"
          value={pondIdInput}
          onChangeText={setPondIdInput}
        />

        <Text style={{ fontSize: 12, color: '#666', marginTop: 8, marginBottom: 6 }}>Select Device Type:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {['Feeding', 'Aerator', 'Farm Eye', 'Power Monitoring'].map((type) => {
            const isSelected = selectedDeviceType === type;
            return (
              <TouchableOpacity
                key={type}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isSelected ? '#0088FF' : '#fff',
                  borderWidth: 1,
                  borderColor: isSelected ? '#0088FF' : '#cbd5e0',
                }}
                onPress={() => setSelectedDeviceType(type)}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: isSelected ? '#fff' : '#4a5568' }}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.largeBtn,
            { backgroundColor: '#8F5AFF', height: 40, paddingVertical: 0, opacity: deviceLoading ? 0.7 : 1 }
          ]}
          onPress={handleGenerateDevice}
          disabled={deviceLoading}
        >
          <Text style={[styles.largeBtnText, { fontSize: 14 }]}>
            {deviceLoading ? 'Generating Device...' : 'Generate IoT Device'}
          </Text>
        </TouchableOpacity>

        {generatedDevices.length > 0 && (
          <View style={{ marginTop: 12, backgroundColor: '#fff', borderRadius: 4, padding: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#00A859', marginBottom: 4 }}>Registered Devices:</Text>
            {generatedDevices.map((id, index) => (
              <Text key={index} style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>
                • {id}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { mobileNumber, fullName, Name, password } = useLocalSearchParams<{ mobileNumber: string, fullName: string, Name: string, password?: string }>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Controlled states for Farmer Details
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNo, setPhoneNo] = useState(mobileNumber || '');
  const [emailId, setEmailId] = useState('');
  const [aadharNo, setAadharNo] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [caaCertificateNo, setCaaCertificateNo] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const displayName = fullName || Name || '';

  useEffect(() => {
    if (displayName) {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length > 0) {
        setFirstName(parts[0]);
      }
      if (parts.length > 1) {
        setLastName(parts.slice(1).join(' '));
      }
    }
  }, [displayName]);

  useEffect(() => {
    if (mobileNumber) {
      setPhoneNo(mobileNumber);
    }
  }, [mobileNumber]);
  const [tempClusters, setTempClusters] = useState(0);
  const [tempPonds, setTempPonds] = useState(0);
  const [submittedClusters, setSubmittedClusters] = useState(0);
  const [submittedPonds, setSubmittedPonds] = useState(0);
  const [selectedClusterName, setSelectedClusterName] = useState('');

  // Fetch Clusters dynamic integration
  const [fetchedClusters, setFetchedClusters] = useState<Array<{ id: number; Name: string; user: number }>>([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [activeClusterPonds, setActiveClusterPonds] = useState<Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    location: string;
  }>>([]);
  const [pondsLoading, setPondsLoading] = useState(false);

  useEffect(() => {
    const loadClusters = async () => {
      setClustersLoading(true);
      try {
        const url = `${process.env.EXPO_PUBLIC_API_URL}/allcluster/`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Mob: mobileNumber || '9178336630'
          }),
        });

        const data = await response.json();
        if (response.ok && data.clusters) {
          setFetchedClusters(data.clusters);
          if (data.clusters.length > 0) {
            setSelectedClusterName(data.clusters[0].Name);
          }
        }
      } catch (error) {
        console.error('Error fetching clusters:', error);
      } finally {
        setClustersLoading(false);
      }
    };

    loadClusters();
  }, [mobileNumber]);

  // Fetch Ponds dynamically when selectedClusterName or fetchedClusters changes
  const fetchPondsForActiveCluster = useCallback(async () => {
    if (fetchedClusters.length === 0) return;
    const activeName = selectedClusterName || fetchedClusters[0].Name;
    const activeCluster = fetchedClusters.find(c => c.Name === activeName);
    if (!activeCluster) return;

    setPondsLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/userponds/${activeCluster.id}/?_t=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      const data = await response.json();
      if (response.ok && data.ponds) {
        const mappedPonds = data.ponds.map((pond: any) => {
          const coords = pond.location || [];
          const firstCoord = coords[0] || [75.0096, 13.3968];
          const lonVal = firstCoord[0] || 75.0096;
          const latVal = firstCoord[1] || 13.3968;

          const poly = `SRID=4326;POLYGON ((${coords.map((c: any) => `${c[0]} ${c[1]}`).join(', ')}))`;

          return {
            id: pond.id,
            name: pond.name,
            latitude: latVal,
            longitude: lonVal,
            location: poly
          };
        });

        setActiveClusterPonds(mappedPonds);
        setTempPonds(mappedPonds.length);
        setSubmittedPonds(mappedPonds.length);

        const newPondsMap: Record<string, any> = {};
        mappedPonds.forEach((p: any, idx: number) => {
          newPondsMap[`${activeCluster.id}-${idx}`] = {
            pondid: p.name,
            latitude: p.latitude,
            longitude: p.longitude,
            location: p.location
          };
        });
        setPondsMap(newPondsMap);
      } else {
        setActiveClusterPonds([]);
        setTempPonds(0);
        setSubmittedPonds(0);
      }
    } catch (error) {
      console.error('Error fetching user ponds:', error);
      setActiveClusterPonds([]);
      setTempPonds(0);
      setSubmittedPonds(0);
    } finally {
      setPondsLoading(false);
    }
  }, [selectedClusterName, fetchedClusters]);

  useEffect(() => {
    fetchPondsForActiveCluster();
  }, [fetchPondsForActiveCluster]);


  // Pond Data states
  const [pondsMap, setPondsMap] = useState<Record<string, {
    pondid: string;
    latitude: number;
    longitude: number;
    location: string;
  }>>({});
  const [pondLoading, setPondLoading] = useState(false);

  const handleUpdatePond = useCallback((key: string, data: { pondid: string; latitude: number; longitude: number; location: string }) => {
    setPondsMap(prev => ({
      ...prev,
      [key]: data
    }));
  }, []);

  const handlePondRegister = async () => {
    let selectedClusterId = 28; // fallback
    let activeClusterId: number | null = null;
    if (fetchedClusters.length > 0) {
      const activeName = selectedClusterName || fetchedClusters[0].Name;
      const found = fetchedClusters.find(c => c.Name === activeName);
      if (found) {
        selectedClusterId = found.id;
        activeClusterId = found.id;
      }
    }

    const userMob = phoneNo ? parseInt(phoneNo, 10) : (mobileNumber ? parseInt(mobileNumber, 10) : 9178336630);
    const pondsArray = Object.entries(pondsMap)
      .filter(([key, pond]) => {
        const [cIdStr, pIndexStr] = key.split('-');
        const cId = parseInt(cIdStr, 10);
        const pIndex = parseInt(pIndexStr, 10);
        
        if (cId === activeClusterId) {
          if (pIndex < activeClusterPonds.length) {
            return false;
          }
        }
        return true;
      })
      .map(([key, pond]) => ({
        ...pond,
        registration: selectedClusterId,
        user: userMob,
      }));

    if (pondsArray.length === 0) {
      Alert.alert('Info', 'No new ponds to register.');
      return;
    }

    setPondLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/pondregister/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pondsArray),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.msg || 'All ponds registered successfully');
        await fetchPondsForActiveCluster();
      } else {
        Alert.alert('Error', data.msg || 'Failed to register ponds. Please try again.');
      }
    } catch (error) {
      console.error('Error registering ponds:', error);
      Alert.alert('Error', 'Network request failed. Please check if the API server is running.');
    } finally {
      setPondLoading(false);
    }
  };

  // Farm Manager Details states
  const [managerMob, setManagerMob] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerLoading, setManagerLoading] = useState(false);

  const handleRegisterManager = async () => {
    if (!managerMob || !managerUsername || !managerEmail) {
      Alert.alert('Error', 'Please fill in all Manager fields');
      return;
    }

    setManagerLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/managerregister/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Mob: parseInt(managerMob, 10),
          username: managerUsername,
          email: managerEmail,
          user: mobileNumber ? parseInt(mobileNumber, 10) : 8260838055,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.msg || 'Manager Registered Successfully');
        // Clear fields on success
        setManagerMob('');
        setManagerUsername('');
        setManagerEmail('');
      } else {
        Alert.alert('Error', data.msg || 'Failed to register manager. Please try again.');
      }
    } catch (error) {
      console.error('Error registering manager:', error);
      Alert.alert('Error', 'Network request failed. Please check if the API server is running.');
    } finally {
      setManagerLoading(false);
    }
  };

  // Farmer Bank Details states
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankLoading, setBankLoading] = useState(false);

  const handleRegisterBank = async () => {
    if (!accountHolder || !bankName || !ifscCode || !branchName || !accountNumber) {
      Alert.alert('Error', 'Please fill in all bank details fields');
      return;
    }

    const userMob = phoneNo ? parseInt(phoneNo, 10) : (mobileNumber ? parseInt(mobileNumber, 10) : 8260838055);

    setBankLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/bankregister/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountholder: accountHolder,
          bankname: bankName,
          ifsccode: ifscCode,
          branchname: branchName,
          accno: accountNumber,
          user: userMob,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.msg || 'Bank Details Registered Successfully');
      } else {
        Alert.alert('Error', data.msg || 'Failed to register bank details. Please try again.');
      }
    } catch (error) {
      console.error('Error registering bank details:', error);
      Alert.alert('Error', 'Network request failed. Please check if the API server is running.');
    } finally {
      setBankLoading(false);
    }
  };

  const fetchBankDetails = useCallback(async () => {
    const userMob = phoneNo || mobileNumber || '8260838055';
    if (!userMob) return;

    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/bankregister/?user=${userMob}&_t=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data) {
          const bankInfo = Array.isArray(data) ? data[0] : data;
          if (bankInfo) {
            if (bankInfo.accountholder) setAccountHolder(bankInfo.accountholder);
            if (bankInfo.bankname) setBankName(bankInfo.bankname);
            if (bankInfo.ifsccode) setIfscCode(bankInfo.ifsccode);
            if (bankInfo.branchname) setBranchName(bankInfo.branchname);
            if (bankInfo.accno) setAccountNumber(bankInfo.accno);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch bank details:', error);
    }
  }, [phoneNo, mobileNumber]);

  useEffect(() => {
    fetchBankDetails();
  }, [phoneNo, mobileNumber, fetchBankDetails]);

  const fetchFarmerProfile = useCallback(async () => {
    const userMob = phoneNo || mobileNumber || '7325912089';
    const userPass = password || 'Satya@2026';

    setProfileLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/farmerprofile/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({
          mobno: userMob,
          password: userPass,
        }),
      });

      const responseData = await response.json();
      if (response.ok && !responseData.error) {
        const profile = responseData.data || responseData;
        
        if (profile.Name) {
          const parts = profile.Name.trim().split(/\s+/);
          if (parts.length > 0) setFirstName(parts[0]);
          if (parts.length > 1) {
            setLastName(parts.slice(1).join(' '));
          } else {
            setLastName('');
          }
          setMiddleName('');
        } else {
          if (profile.fname) setFirstName(profile.fname);
          if (profile.mname !== undefined) setMiddleName(profile.mname);
          if (profile.lname) setLastName(profile.lname);
        }
        
        if (profile.mobno) setPhoneNo(profile.mobno.toString());
        else if (profile.Mob) setPhoneNo(profile.Mob.toString());

        if (profile.email) setEmailId(profile.email);
        else if (profile.Email) setEmailId(profile.Email);

        if (profile.adharno) setAadharNo(profile.adharno.toString());
        if (profile.father_name) setFatherName(profile.father_name);
        if (profile.mother_name) setMotherName(profile.mother_name);
        
        if (profile.address1) setAddress1(profile.address1);
        else if (profile.address) setAddress1(profile.address);
        
        if (profile.address2 !== undefined) setAddress2(profile.address2);
        if (profile.address3 !== undefined) setAddress3(profile.address3);
        if (profile.dist) setDistrict(profile.dist);
        if (profile.state) setState(profile.state);
        if (profile.pin) setPinCode(profile.pin);
        if (profile.certificateno) setCaaCertificateNo(profile.certificateno);
      }
    } catch (error) {
      console.warn('Failed to fetch farmer profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [phoneNo, mobileNumber, password]);

  useEffect(() => {
    fetchFarmerProfile();
  }, [fetchFarmerProfile]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/allcluster/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({
          Mob: mobileNumber || '9178336630'
        }),
      });

      const data = await response.json();
      if (response.ok && data.clusters) {
        setFetchedClusters(data.clusters);
        if (data.clusters.length > 0) {
          setSelectedClusterName(data.clusters[0].Name);
        }
      }
      
      await Promise.all([
        fetchBankDetails(),
        fetchFarmerProfile(),
        fetchPondsForActiveCluster()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [mobileNumber, fetchBankDetails, fetchFarmerProfile, fetchPondsForActiveCluster]);

  const [profileUpdating, setProfileUpdating] = useState(false);

  const handleUpdateFarmer = async () => {
    const userMob = phoneNo || mobileNumber || '7325912089';
    const userPass = password || 'Satya@2026';

    setProfileUpdating(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/farmerupdate/`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobno: userMob,
          fname: firstName,
          mname: middleName,
          lname: lastName,
          adharno: aadharNo,
          father_name: fatherName,
          mother_name: motherName,
          address1: address1,
          address2: address2,
          address3: address3,
          dist: district,
          state: state,
          pin: pinCode,
          certificateno: caaCertificateNo,
          email: emailId,
          password: userPass
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', data.message || 'Farmer Details Updated Successfully');
      } else {
        Alert.alert('Error', data.message || 'Failed to update farmer details. Please try again.');
      }
    } catch (error) {
      console.error('Error updating farmer details:', error);
      Alert.alert('Error', 'Network request failed. Please check if the API server is running.');
    } finally {
      setProfileUpdating(false);
    }
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity accessibilityLabel="Menu" onPress={() => setIsMenuOpen(true)}>
            <Ionicons name="menu" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Exit" onPress={() => router.replace('/')}>
            <Ionicons name="log-out-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Complete the Profile</Text>
      </View>
      <View style={styles.separator} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Card 1: Farmer Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Farmer Details</Text>
          <InputField label="First Name" value={firstName} onChangeText={setFirstName} />
          <InputField label="Middle Name" required={false} value={middleName} onChangeText={setMiddleName} />
          <InputField label="Last Name" value={lastName} onChangeText={setLastName} />
          <InputField label="Phone No" value={phoneNo} onChangeText={setPhoneNo} />
          <InputField label="Email Id" value={emailId} onChangeText={setEmailId} />
          <InputField label="Aadhar No" value={aadharNo} onChangeText={setAadharNo} />
          <InputField label="Father's Name" value={fatherName} onChangeText={setFatherName} />
          <InputField label="Mother's Name" value={motherName} onChangeText={setMotherName} />
          <InputField label="Address 1" value={address1} onChangeText={setAddress1} />
          <InputField label="Address 2" required={false} value={address2} onChangeText={setAddress2} />
          <InputField label="Address 3" required={false} value={address3} onChangeText={setAddress3} />
          <InputField label="District" value={district} onChangeText={setDistrict} />
          <InputField label="State" value={state} onChangeText={setState} />
          <InputField label="Pin code" value={pinCode} onChangeText={setPinCode} />

          <TouchableOpacity
            style={[
              styles.largeBtn,
              { backgroundColor: '#0088FF', marginTop: 12, opacity: profileUpdating || profileLoading ? 0.7 : 1 }
            ]}
            onPress={handleUpdateFarmer}
            disabled={profileUpdating || profileLoading}
          >
            <Text style={styles.largeBtnText}>
              {profileUpdating ? 'Updating...' : (profileLoading ? 'Loading Profile...' : 'Update Farmer Details')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card 2: Cluster / Ponds Management */}
        <View style={styles.card}>
          <View style={styles.dropdownsContainer}>
            <DropdownBox
              label="Cluster"
              value={
                fetchedClusters.length > 0
                  ? (selectedClusterName || fetchedClusters[0].Name)
                  : tempClusters.toString()
              }
              items={
                fetchedClusters.length > 0
                  ? fetchedClusters.map(c => c.Name)
                  : undefined
              }
              onSelect={(val) => {
                if (fetchedClusters.length > 0) {
                  setSelectedClusterName(val);
                } else {
                  setTempClusters(parseInt(val));
                }
              }}
            />
            <DropdownBox label="Ponds" value={tempPonds.toString()} onSelect={(val) => setTempPonds(parseInt(val))} />
          </View>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F09E38' }]} onPress={() => {
              setTempPonds(prev => prev + 1);
              setSubmittedPonds(prev => prev + 1);
            }}>
              <Text style={styles.actionBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#00A859' }]} onPress={() => {
              setSubmittedClusters(tempClusters);
              setSubmittedPonds(tempPonds);
            }}>
              <Text style={styles.actionBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card 3: Cluster Details */}
        {(clustersLoading || pondsLoading) && (
          <View style={[styles.card, { alignItems: 'center', padding: 20 }]}>
            <Text style={{ fontSize: 14, color: '#666' }}>
              {clustersLoading ? 'Loading your clusters...' : 'Loading registered ponds...'}
            </Text>
          </View>
        )}

        {fetchedClusters.length > 0 ? (
          (() => {
            const activeName = selectedClusterName || fetchedClusters[0].Name;
            const activeCluster = fetchedClusters.find(c => c.Name === activeName);
            if (!activeCluster) return null;
            if (activeClusterPonds.length === 0 && submittedPonds === 0) return null;

            return (
              <View style={styles.card}>
                <View style={{ marginBottom: 15, alignSelf: 'flex-start' }}>
                  <DropdownBox
                    label="Cluster"
                    value={activeCluster.Name}
                    disabled={true}
                  />
                </View>

                {Array.from({ length: submittedPonds }).map((_, pIndex) => {
                  const existingPond = activeClusterPonds[pIndex];
                  let initialData = undefined;

                  if (existingPond) {
                    initialData = {
                      id: existingPond.id,
                      pondid: existingPond.name,
                      latitude: existingPond.latitude,
                      longitude: existingPond.longitude,
                      location: existingPond.location,
                      locationName: `Lat: ${existingPond.latitude.toFixed(4)}, Lng: ${existingPond.longitude.toFixed(4)}`
                    };
                  }

                  return (
                    <PondDetails
                      key={`pond-${activeCluster.id}-${pIndex}`}
                      title={`Pond ${pIndex + 1}`}
                      cIndex={0}
                      pIndex={pIndex}
                      initialData={initialData}
                      onUpdate={(pondData) => handleUpdatePond(`${activeCluster.id}-${pIndex}`, pondData)}
                    />
                  );
                })}
              </View>
            );
          })()
        ) : (
          Array.from({ length: submittedClusters }).map((_, cIndex) => (
            <View key={`cluster-${cIndex}`} style={styles.card}>
              <View style={{ marginBottom: 15, alignSelf: 'flex-start' }}>
                <DropdownBox
                  label="Cluster"
                  value={(cIndex + 1).toString()}
                  disabled={true}
                />
              </View>

              {Array.from({ length: submittedPonds }).map((_, pIndex) => (
                <PondDetails
                  key={`pond-${cIndex}-${pIndex}`}
                  title={`Pond ${pIndex + 1}`}
                  cIndex={cIndex}
                  pIndex={pIndex}
                  onUpdate={(pondData) => handleUpdatePond(`${cIndex}-${pIndex}`, pondData)}
                />
              ))}
            </View>
          ))
        )}

        {/* Card 4: Certificate Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Certificate Details</Text>
          <InputField label="CAA Certificate No" value={caaCertificateNo} onChangeText={setCaaCertificateNo} />
        </View>

        {/* Card 5: Farm Manager Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Farm Manager Details</Text>
          <InputField label="No of Manager" />
          <InputField label="No of Ponds/Farms" />
          <InputField label="No of Aerators" />

          <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 8 }}>Register Farm Manager</Text>

          <WhiteBoxInput
            label="Manager Username"
            value={managerUsername}
            onChangeText={setManagerUsername}
          />
          <WhiteBoxInput
            label="Manager Mobile No"
            value={managerMob}
            onChangeText={setManagerMob}
          />
          <WhiteBoxInput
            label="Manager Email"
            value={managerEmail}
            onChangeText={setManagerEmail}
          />

          <TouchableOpacity
            style={[
              styles.largeBtn,
              { backgroundColor: '#0088FF', marginTop: 12, opacity: managerLoading ? 0.7 : 1 }
            ]}
            onPress={handleRegisterManager}
            disabled={managerLoading}
          >
            <Text style={styles.largeBtnText}>
              {managerLoading ? 'Registering...' : 'Register Manager'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card 6: Farmer Bank Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Farmer Bank Details</Text>
          <InputField label="Account Holder" value={accountHolder} onChangeText={setAccountHolder} />
          <InputField label="Bank Name" value={bankName} onChangeText={setBankName} />
          <InputField label="IFSC Code" value={ifscCode} onChangeText={setIfscCode} />
          <InputField label="Branch Name" value={branchName} onChangeText={setBranchName} />
          <InputField label="Account Number" value={accountNumber} onChangeText={setAccountNumber} />

          <TouchableOpacity
            style={[
              styles.largeBtn,
              { backgroundColor: '#00A859', marginTop: 12, opacity: bankLoading ? 0.7 : 1 }
            ]}
            onPress={handleRegisterBank}
            disabled={bankLoading}
          >
            <Text style={styles.largeBtnText}>
              {bankLoading ? 'Registering...' : 'Register Bank Details'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Global form actions */}
        <View style={styles.globalActionsContainer}>
          <TouchableOpacity style={[styles.largeBtn, { backgroundColor: '#F09E38' }]}>
            <Text style={styles.largeBtnText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.largeBtn, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.largeBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.largeBtn, { backgroundColor: '#00A859', opacity: pondLoading ? 0.7 : 1 }]}
            onPress={handlePondRegister}
            disabled={pondLoading}
          >
            <Text style={styles.largeBtnText}>
              {pondLoading ? 'Submitting Ponds...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Side Menu Drawer */}
      {isMenuOpen && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} onPress={() => setIsMenuOpen(false)} activeOpacity={1} />
          <View style={styles.menuDrawer}>
            <View style={styles.menuHeader}>
              <View style={styles.menuLogoContainer}>
                <Image source={require('../assets/images/bariflo-logo.png')} style={styles.menuLogo} resizeMode="contain" />
              </View>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                <Ionicons name="close-outline" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.menuSection}>
              <Text style={styles.menuSubTitle}>Main</Text>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="home" size={20} color="#000" style={styles.menuItemIcon} />
                <Text style={styles.menuItemText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="person" size={20} color="#000" style={styles.menuItemIcon} />
                <Text style={styles.menuItemText}>User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    color: '#007ACC',
    fontWeight: '400',
    paddingLeft: 2,
  },
  separator: {
    height: 3,
    backgroundColor: '#e6e6e6',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 9,
  },
  scrollContent: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: '#999',
    marginBottom: 8,
  },
  required: {
    color: '#d32f2f',
  },
  input: {
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 4,
    fontSize: 16,
    color: '#333',
  },
  dropdownsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
    marginBottom: 20,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownLabel: {
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 80,
  },
  dropdownValue: {
    fontSize: 15,
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  nestedGrayBox: {
    backgroundColor: '#f4f4f4',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  nestedBoxTitle: {
    fontSize: 15,
    color: '#000',
    marginBottom: 12,
  },
  whiteInputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 4,
    height: 48,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 8,
  },
  fakePlaceholder: {
    position: 'absolute',
    flexDirection: 'row',
    left: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: '#999',
  },
  inlineTextInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  iconCenter: {
    alignItems: 'center',
    marginVertical: 10,
  },
  globalActionsContainer: {
    marginTop: 10,
    marginBottom: 40,
    gap: 12,
  },
  largeBtn: {
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 100,
    flexDirection: 'row',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuDrawer: {
    width: '75%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 0,
    paddingRight: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 10 : 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -15, // Negative margin to shift it perfectly to the left as requested
  },
  menuLogoText: {
    fontSize: 16,
    fontWeight: '400',
    marginLeft: 4,
  },
  menuLogo: {
    width: 200,
    height: 100,
  },
  menuSection: {
    padding: 20,
  },
  menuSubTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemIcon: {
    width: 24,
    marginRight: 10,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapModalContainer: {
    width: '90%',
    height: '70%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mapHeaderTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#0088FF',
    padding: 10,
    borderRadius: 4,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdownMenu: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
  },
  dropdownMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownMenuItemText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  mapView: {
    flex: 1,
  },
  mapFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmBtn: {
    backgroundColor: '#00A859',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
