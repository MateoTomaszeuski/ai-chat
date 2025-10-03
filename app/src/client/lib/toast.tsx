import toast, { type ToastOptions } from 'react-hot-toast';
import { type ReactNode } from 'react';
import { IoWarning, IoCheckmarkCircle, IoInformationCircle } from 'react-icons/io5';
import { CustomToast } from '../components/CustomToast';

const defaultToastOptions: ToastOptions = {
  duration: Infinity, // Don't auto-dismiss
  position: 'top-right',
};

export const customToast = {
  error: (message: ReactNode, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          message={message}
          icon={<IoWarning />}
          iconColor="text-red-500"
        />
      ),
      { ...defaultToastOptions, ...options }
    );
  },

  success: (message: ReactNode, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          message={message}
          icon={<IoCheckmarkCircle />}
          iconColor="text-green-500"
        />
      ),
      { ...defaultToastOptions, ...options }
    );
  },

  info: (message: ReactNode, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          message={message}
          icon={<IoInformationCircle />}
          iconColor="text-blue-500"
        />
      ),
      { ...defaultToastOptions, ...options }
    );
  },

  custom: (message: ReactNode, options?: ToastOptions) => {
    return toast.custom(
      (t) => (
        <CustomToast
          t={t}
          message={message}
        />
      ),
      { ...defaultToastOptions, ...options }
    );
  },
};

// Network error handler that extracts meaningful error messages
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Check if it's a network error with response details
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    // Check for HTTP status errors
    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    
    if (error.message.includes('500')) {
      return 'Server error occurred. Please try again later.';
    }
    
    if (error.message.includes('403')) {
      return 'You don\'t have permission to perform this action.';
    }
    
    if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    
    // Return the actual error message if it's descriptive
    if (error.message && error.message !== 'Network Error' && !error.message.includes('fetch')) {
      return error.message;
    }
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Global error toast function
export const showErrorToast = (error: unknown) => {
  const message = getErrorMessage(error);
  return customToast.error(message);
};

/**
 * Example usage:
 * 
 * import { customToast } from '../lib/toast';
 * 
 * // Error toast (automatically handled for network requests)
 * customToast.error('Something went wrong!');
 * 
 * // Success toast
 * customToast.success('Operation completed successfully!');
 * 
 * // Info toast
 * customToast.info('This is important information.');
 * 
 * // Custom toast
 * customToast.custom('Custom message');
 */