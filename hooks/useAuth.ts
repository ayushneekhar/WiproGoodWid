import {useState, useEffect, useCallback} from 'react';
import {NativeModules, Alert} from 'react-native';
import {User, LoginMethod, AuthState} from '../types/TuyaTypes';
import StorageService from '../utils/StorageService';

const {TuyaModule} = NativeModules;

export interface UseAuthReturn extends AuthState {
  login: (method: LoginMethod, credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationCode: (email: string, isRegister?: boolean) => Promise<void>;
  clearError: () => void;
}

export interface LoginCredentials {
  phoneNumber?: string;
  email?: string;
  password?: string;
  verificationCode?: string;
}

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    user: null,
    isLoading: true, // Start with loading to check stored login
    error: null,
  });

  // Check for stored login on initialization
  useEffect(() => {
    const checkStoredLogin = async () => {
      try {
        const storedUser = StorageService.getUserData();
        const isStoredLoggedIn = StorageService.isLoggedIn();

        if (storedUser && isStoredLoggedIn) {
          setAuthState({
            isLoggedIn: true,
            user: storedUser,
            isLoading: false,
            error: null,
          });
          console.log('User auto-logged in:', storedUser.username);
        } else {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error('Error checking stored login:', error);
        setAuthState({
          isLoggedIn: false,
          user: null,
          isLoading: false,
          error: 'Failed to check stored login',
        });
      }
    };

    checkStoredLogin();
  }, []);

  const loginWithPhone = async (
    phoneNumber: string,
    password: string,
  ): Promise<User> => {
    const userData = await TuyaModule.loginWithPhone(phoneNumber, password);
    return userData;
  };

  const loginWithEmail = async (
    email: string,
    password: string,
  ): Promise<User> => {
    const userData = await TuyaModule.loginWithEmail(email, password);
    return userData;
  };

  const verifyEmailCode = async (
    email: string,
    code: string,
  ): Promise<User> => {
    const userData = await TuyaModule.verifyEmailCode(email, code);
    return userData;
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    code: string,
  ): Promise<User> => {
    const userData = await TuyaModule.registerUsingEmail(email, password, code);
    return userData;
  };

  const login = useCallback(
    async (method: LoginMethod, credentials: LoginCredentials) => {
      setAuthState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        let userData: User;

        switch (method) {
          case 'phone':
            if (!credentials.phoneNumber || !credentials.password) {
              throw new Error('Phone number and password are required');
            }
            userData = await loginWithPhone(
              credentials.phoneNumber,
              credentials.password,
            );
            break;

          case 'email':
            if (!credentials.email || !credentials.password) {
              throw new Error('Email and password are required');
            }
            userData = await loginWithEmail(
              credentials.email,
              credentials.password,
            );
            break;

          case 'emailCode':
            if (!credentials.email || !credentials.verificationCode) {
              throw new Error('Email and verification code are required');
            }
            userData = await verifyEmailCode(
              credentials.email,
              credentials.verificationCode,
            );
            break;

          case 'register':
            if (
              !credentials.email ||
              !credentials.password ||
              !credentials.verificationCode
            ) {
              throw new Error(
                'Email, password, and verification code are required',
              );
            }
            userData = await registerWithEmail(
              credentials.email,
              credentials.password,
              credentials.verificationCode,
            );
            break;

          default:
            throw new Error(`Unsupported login method: ${method}`);
        }

        // Save to storage
        StorageService.saveUserData(userData);
        StorageService.setLoggedIn(true);
        StorageService.setLoginMethod(method);
        StorageService.saveCredentials({
          phoneNumber: credentials.phoneNumber,
          email: credentials.email,
        });

        setAuthState({
          isLoggedIn: true,
          user: userData,
          isLoading: false,
          error: null,
        });

        console.log('Login successful:', userData.username);
      } catch (error: any) {
        const errorMessage = error.message || 'Login failed';
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error; // Re-throw so components can handle it
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    console.log('useAuth: logout() called');
    setAuthState(prev => ({
      ...prev,
      isLoading: true,
    }));

    try {
      console.log('useAuth: Clearing storage...');
      // Clear storage
      StorageService.clearUserData();
      StorageService.setLoggedIn(false);

      console.log('useAuth: Setting auth state to logged out...');
      setAuthState({
        isLoggedIn: false,
        user: null,
        isLoading: false,
        error: null,
      });

      console.log(
        'useAuth: Logout successful, state should be isLoggedIn=false',
      );
    } catch (error: any) {
      console.error('Error during logout:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Logout failed',
      }));
    }
  }, []);

  const sendVerificationCode = useCallback(
    async (email: string, isRegister: boolean = false) => {
      setAuthState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        await TuyaModule.sendVerificationCodeToEmail(email, isRegister);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
        console.log('Verification code sent to:', email);
      } catch (error: any) {
        const errorMessage =
          error.message || 'Failed to send verification code';
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    sendVerificationCode,
    clearError,
  };
};

export default useAuth;
