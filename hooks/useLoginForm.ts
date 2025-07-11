import {useReducer, useCallback} from 'react';
import {LoginFormState, LoginFormAction, LoginMethod} from '../types/TuyaTypes';

const initialState: LoginFormState = {
  method: 'email',
  phoneNumber: '',
  email: '',
  password: '',
  verificationCode: '',
  codeSent: false,
  isLoading: false,
  error: null,
};

const loginFormReducer = (
  state: LoginFormState,
  action: LoginFormAction,
): LoginFormState => {
  switch (action.type) {
    case 'SET_METHOD':
      return {
        ...state,
        method: action.payload,
        error: null,
        codeSent: false,
      };

    case 'SET_FIELD':
      return {
        ...state,
        [action.payload.field]: action.payload.value,
        error: null,
      };

    case 'SET_CODE_SENT':
      return {
        ...state,
        codeSent: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'RESET_FORM':
      return initialState;

    default:
      return state;
  }
};

export interface UseLoginFormReturn {
  state: LoginFormState;
  setMethod: (method: LoginMethod) => void;
  setField: (field: keyof LoginFormState, value: string) => void;
  setCodeSent: (sent: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetForm: () => void;
  isFormValid: boolean;
  canSendCode: boolean;
}

export const useLoginForm = (): UseLoginFormReturn => {
  const [state, dispatch] = useReducer(loginFormReducer, initialState);

  const setMethod = useCallback((method: LoginMethod) => {
    dispatch({type: 'SET_METHOD', payload: method});
  }, []);

  const setField = useCallback((field: keyof LoginFormState, value: string) => {
    dispatch({type: 'SET_FIELD', payload: {field, value}});
  }, []);

  const setCodeSent = useCallback((sent: boolean) => {
    dispatch({type: 'SET_CODE_SENT', payload: sent});
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({type: 'SET_LOADING', payload: loading});
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({type: 'SET_ERROR', payload: error});
  }, []);

  const resetForm = useCallback(() => {
    dispatch({type: 'RESET_FORM'});
  }, []);

  // Form validation logic
  const isFormValid = (() => {
    switch (state.method) {
      case 'phone':
        return state.phoneNumber.trim() !== '' && state.password.trim() !== '';

      case 'email':
        return state.email.trim() !== '' && state.password.trim() !== '';

      case 'emailCode':
        return (
          state.email.trim() !== '' && state.verificationCode.trim() !== ''
        );

      case 'register':
        return (
          state.email.trim() !== '' &&
          state.password.trim() !== '' &&
          state.verificationCode.trim() !== ''
        );

      default:
        return false;
    }
  })();

  const canSendCode = (() => {
    return (
      state.email.trim() !== '' &&
      !state.isLoading &&
      (state.method === 'emailCode' || state.method === 'register')
    );
  })();

  return {
    state,
    setMethod,
    setField,
    setCodeSent,
    setLoading,
    setError,
    resetForm,
    isFormValid,
    canSendCode,
  };
};

export default useLoginForm;
