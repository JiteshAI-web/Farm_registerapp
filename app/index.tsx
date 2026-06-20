import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform, SafeAreaView, useWindowDimensions, ScrollView, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const router = useRouter();

  const isWeb = width > 768;

  const onRefresh = () => {
    setRefreshing(true);
    setFullName('');
    setMobileNumber('');
    setPassword('');
    setAgreed(false);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const handleCreateAccount = async () => {
    if (!fullName || !mobileNumber || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!agreed) {
      Alert.alert('Error', 'Please agree to Terms & Conditions');
      return;
    }

    setLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/sendotp/`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Name: fullName,
          password: password,
          Mob: mobileNumber,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', data.message || 'OTP sent successfully', [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/otp',
                params: { 
                  mobileNumber: mobileNumber,
                  fullName: fullName,
                  password: password
                }
              });
            },
          },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert('Error', 'Network request failed. Please check if the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

              <Text style={styles.title}>Welcome to Bariflo Aqua Farm</Text>
              <Text style={styles.subtitle}>
                Already have an account? <Text style={styles.linkText} onPress={() => router.push('/login')}>Log in</Text>
              </Text>

              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#a0aab2"
                  value={fullName}
                  onChangeText={setFullName}
                />

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

                <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                    {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxText}>
                    I agree to <Text style={styles.termsLink}>Terms & Conditions</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitButton, loading && { opacity: 0.7 }]} 
                  activeOpacity={0.8} 
                  onPress={handleCreateAccount}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Sending OTP...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>
                  Didn't receive an OTP from a previous attempt? <Text style={styles.resendLink}>Resend OTP</Text>
                </Text>
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: '#2b6cb0',
    borderColor: '#2b6cb0',
  },
  checkboxText: {
    fontSize: 13,
    color: '#4a5568',
  },
  termsLink: {
    color: '#6b46c1',
    fontWeight: '500',
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
  footerText: {
    fontSize: 12,
    color: '#7b8794',
    marginTop: 16,
  },
  resendLink: {
    color: '#2b6cb0',
    textDecorationLine: 'underline',
  },
});
