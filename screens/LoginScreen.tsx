import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList, LoginMethod} from '../types/TuyaTypes';
import {useAuthContext} from '../contexts/AuthContext';
import useLoginForm from '../hooks/useLoginForm';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const {login, sendVerificationCode, isLoading, error, clearError} =
    useAuthContext();
  const {
    state,
    setMethod,
    setField,
    setCodeSent,
    setError: setFormError,
    resetForm,
    isFormValid,
    canSendCode,
  } = useLoginForm();

  const loginMethods: {key: LoginMethod; label: string}[] = [
    {key: 'email', label: 'Email & Password'},
    {key: 'emailCode', label: 'Email & Code'},
    {key: 'phone', label: 'Phone & Password'},
    {key: 'register', label: 'Register New Account'},
  ];

  const handleLogin = async () => {
    if (!isFormValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    clearError();

    try {
      await login(state.method, {
        phoneNumber: state.phoneNumber,
        email: state.email,
        password: state.password,
        verificationCode: state.verificationCode,
      });

      // Login successful - App.tsx will automatically render DashboardScreen
      // when isLoggedIn becomes true
      console.log('Login successful');
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setFormError(errorMessage);
      Alert.alert('Login Failed', errorMessage);
    }
  };

  const handleSendCode = async () => {
    if (!canSendCode) return;

    try {
      const isRegister = state.method === 'register';
      await sendVerificationCode(state.email, isRegister);
      setCodeSent(true);
      Alert.alert('Success', 'Verification code sent to your email');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send verification code';
      setFormError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  };

  const renderMethodTabs = () => (
    <View style={styles.tabContainer}>
      {loginMethods.map(method => (
        <TouchableOpacity
          key={method.key}
          style={[styles.tab, state.method === method.key && styles.activeTab]}
          onPress={() => setMethod(method.key)}>
          <Text
            style={[
              styles.tabText,
              state.method === method.key && styles.activeTabText,
            ]}>
            {method.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmailFields = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={state.email}
          onChangeText={text => setField('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {(state.method === 'email' || state.method === 'register') && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={state.password}
            onChangeText={text => setField('password', text)}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {(state.method === 'emailCode' || state.method === 'register') && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <View style={styles.codeInputContainer}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="Enter code"
                value={state.verificationCode}
                onChangeText={text => setField('verificationCode', text)}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity
                style={[
                  styles.sendCodeButton,
                  !canSendCode && styles.sendCodeButtonDisabled,
                ]}
                onPress={handleSendCode}
                disabled={!canSendCode || isLoading}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendCodeText}>
                    {state.codeSent ? 'Resend' : 'Send Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {state.codeSent && (
            <Text style={styles.codeHint}>
              Check your email for the verification code
            </Text>
          )}
        </>
      )}
    </>
  );

  const renderPhoneFields = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your phone number"
          value={state.phoneNumber}
          onChangeText={text => setField('phoneNumber', text)}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={state.password}
          onChangeText={text => setField('password', text)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </>
  );

  const getButtonText = () => {
    switch (state.method) {
      case 'register':
        return 'Register Account';
      case 'emailCode':
        return 'Login with Code';
      default:
        return 'Login';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Platform.OS === 'android' ? '#2196F3' : undefined}
        translucent={false}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Wipro GoodWid</Text>
          <Text style={styles.subtitle}>Smart Home Control</Text>
        </View>

        {renderMethodTabs()}

        <View style={styles.formContainer}>
          {state.method === 'phone' ? renderPhoneFields() : renderEmailFields()}

          {(error || state.error) && (
            <Text style={styles.errorText}>{error || state.error}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.loginButton,
              (!isFormValid || isLoading) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!isFormValid || isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>{getButtonText()}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
            <Text style={styles.resetButtonText}>Clear Form</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2196F3',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    marginRight: 10,
  },
  sendCodeButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sendCodeButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendCodeText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  codeHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default LoginScreen;
