import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function OTPScreen() {
  const { mobileNumber, fullName, Name } = useLocalSearchParams<{ mobileNumber: string, fullName: string, Name: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);
  const { width } = useWindowDimensions();
  const router = useRouter();

  const isWeb = width > 768;

  const handleChangeText = (text: string, index: number) => {
    // Only allow numbers
    if (text.length > 0 && !/^[0-9]+$/.test(text)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && !otp[index]) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/verifyotp/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Mob: mobileNumber || '',
          country_code: '+91',
          otp: otpValue,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message || 'OTP verified successfully', [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/profile',
                params: {
                  mobileNumber: mobileNumber || '',
                  fullName: fullName || Name || '',
                  Name: Name || fullName || ''
                }
              });
            },
          },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
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

              <Text style={styles.title}>OTP Verification</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to your mobile number to verify your account.
              </Text>

              <View style={styles.formContainer}>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputs.current[index] = ref; }}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(text) => handleChangeText(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && { opacity: 0.7 }]}
                  activeOpacity={0.8}
                  onPress={handleVerify}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => router.back()}>
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
    lineHeight: 20,
  },
  formContainer: {
    gap: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    maxWidth: 300,
    width: '100%',
    alignSelf: 'center',
  },
  otpInput: {
    width: 42,
    height: 52,
    backgroundColor: '#f2f6fa',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#7b8794',
    fontSize: 14,
    fontWeight: '500',
  },
});
