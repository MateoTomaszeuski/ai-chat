import { type ReactNode } from 'react';
import toast, { type Toast } from 'react-hot-toast';
import { IoClose } from 'react-icons/io5';

interface CustomToastProps {
  t: Toast;
  message: ReactNode;
  icon?: ReactNode;
  iconColor?: string;
}

export const CustomToast = ({ t, message, icon, iconColor = 'text-slate-500' }: CustomToastProps) => {
  return (
    <div
      className={`flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-lg max-w-md min-w-80 transition-all duration-300 ${
        t.visible ? 'animate-enter' : 'animate-leave'
      }`}
      style={{
        transform: t.visible ? 'scale(1)' : 'scale(0.95)',
        opacity: t.visible ? 1 : 0,
      }}
    >
      {icon && (
        <div className={`flex-shrink-0 ${iconColor} text-xl mt-0.5`}>
          {icon}
        </div>
      )}
      
      <div className="flex-1 text-slate-700 text-sm leading-relaxed min-w-0">
        {message}
      </div>
      
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-100"
        aria-label="Close"
      >
        <IoClose size={16} />
      </button>
    </div>
  );
};