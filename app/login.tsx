import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function LoginScreen() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const router = useRouter();

  const isWeb = width > 768;

  const handleLogin = async () => {
    if (!mobileNumber || !password) {
      Alert.alert('Error', 'Please enter your mobile number and password');
      return;
    }

    setLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/farmerprofile/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobno: mobileNumber,
          password: password,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.data) {
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => {
              router.replace({
                pathname: '/profile',
                params: {
                  mobileNumber: mobileNumber,
                  password: password,
                  fullName: responseData.data.Name || ''
                }
              });
            },
          },
        ]);
      } else {
        const errorMsg = responseData.error || responseData.message || 'Invalid credentials or user not found. Please try again.';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert('Error', 'Network request failed. Please check if the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, isWeb ? styles.cardWeb : styles.cardMobile]}>

          {/* Left Side (Illustration) */}
          {isWeb && (
            <View style={styles.leftPane}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/images/bariflo-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.companyName}>
                  <Text style={styles.companyNameBlue}>Bariflo</Text> Cybernetics
                </Text>
              </View>
              <View style={styles.illustrationContainer}>
                <Image
                  source={require('../assets/images/farmer_illustration.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* Right Side (Form) */}
          <View style={[styles.rightPane, !isWeb && styles.rightPaneMobile]}>
            <View style={styles.formWrapper}>
              {!isWeb && (
                <View style={styles.mobileLogoContainer}>
                  <Image
                    source={require('../assets/images/bariflo-logo.png')}
                    style={styles.mobileLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.companyName}>
                    <Text style={styles.companyNameBlue}>Bariflo</Text> Cybernetics
                  </Text>
                </View>
              )}

              <Text style={styles.title}>Login to Aqua Farm</Text>
              <Text style={styles.subtitle}>
                Don't have an account? <Text style={styles.linkText} onPress={() => router.push('/')}>Sign up</Text>
              </Text>

              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number"
                  placeholderTextColor="#a0aab2"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter Password"
                    placeholderTextColor="#a0aab2"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#7b8794" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && { opacity: 0.7 }]}
                  activeOpacity={0.8}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Logging in...' : 'Log In'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  activeOpacity={0.8}
                  onPress={() => router.push('/')}
                >
                  <Text style={styles.backButtonText}>Back to Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dfe6ec',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    flexDirection: 'row',
  },
  cardWeb: {
    width: '100%',
    maxWidth: 900,
    height: 550,
  },
  cardMobile: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'column',
  },
  leftPane: {
    flex: 1,
    backgroundColor: '#eef3f8',
    padding: 30,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  mobileLogoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 30,
    marginBottom: 5,
  },
  mobileLogo: {
    width: 80,
    height: 40,
    marginBottom: 5,
  },
  companyName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  companyNameBlue: {
    color: '#0066cc',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  rightPane: {
    flex: 1.2,
    backgroundColor: '#fff',
    padding: 40,
    justifyContent: 'center',
  },
  rightPaneMobile: {
    padding: 24,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : 'serif',
    fontSize: 26,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#7b8794',
    marginBottom: 30,
  },
  linkText: {
    color: '#2b6cb0',
    fontWeight: '500',
  },
  formContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: '#f2f6fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  passwordContainer: {
    backgroundColor: '#f2f6fa',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#2b6cb0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#7b8794',
    fontSize: 14,
    fontWeight: '500',
  },
});
