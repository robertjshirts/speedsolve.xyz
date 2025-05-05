import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-skin-base bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-lg p-8 relative bg-skin-fill border-2 border-skin-accent rounded-xl shadow-xl transition duration-300 hover:shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-skin-accent hover:text-skin-primary transition duration-150"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Decorative Accent Line - matching ProfileCard */}
        <div className="w-16 h-1 bg-skin-accent mx-auto mb-6 rounded-full"></div>

        {/* Modal Content */}
        <div className="text-skin-base">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;