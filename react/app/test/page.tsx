'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';

export default function ModalTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-skin-fill p-8 flex flex-col items-center justify-center gap-8">
      {/* Test button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-6 py-3 bg-skin-accent text-skin-base rounded-xl font-medium transition duration-300 hover:shadow-lg"
      >
        Open Modal
      </button>

      {/* Sample modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-skin-primary text-center">
            Welcome to the Modal
          </h2>
          
          <p className="text-skin-base text-center">
            This is a sample modal that matches your design system.
          </p>
          
          <div className="space-y-4">
            <p className="text-skin-accent text-center italic">
              Here&apos;s some accent-colored text, similar to the bio in ProfileCard.
            </p>
            
            <div className="text-skin-base text-sm text-center space-y-2 border-t border-skin-base pt-4">
              <p className="flex items-center justify-center gap-2">
                <span className="font-medium">Sample Label:</span>
                <span>Sample Value</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <span className="font-medium">Another Label:</span>
                <span>Another Value</span>
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2 bg-skin-accent text-skin-base rounded-lg font-medium transition duration-300 hover:shadow-md"
            >
              Close Modal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}