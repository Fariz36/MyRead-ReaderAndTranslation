"use client";

import type React from "react";
import { useState } from "react";
import { X, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";

interface TranslationMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: "method1" | "method2") => void;
}

const TranslationMethodModal: React.FC<TranslationMethodModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [selectedMethod, setSelectedMethod] = useState<"method1" | "method2" | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen) return null;

  const handleMethodSelect = (method: "method1" | "method2") => {
    setSelectedMethod(method);
  };

  const handleConfirm = () => {
    if (selectedMethod) {
      onSelect(selectedMethod);
      onClose();
    }
  };

  const handleExit = () => {
    setSelectedMethod(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Choose Translation Method</h2>
          <Button variant="ghost" size="icon" onClick={handleExit}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="radio"
              id="method1"
              name="translationMethod"
              value="method1"
              checked={selectedMethod === "method1"}
              onChange={() => handleMethodSelect("method1")}
              className="mr-2"
            />
            <label htmlFor="method1"> LLama 3.3 70b </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="method2"
              name="translationMethod"
              value="method2"
              checked={selectedMethod === "method2"}
              onChange={() => handleMethodSelect("method2")}
              className="mr-2"
            />
            <label htmlFor="method2"> DeepL </label>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={handleConfirm}
              disabled={!selectedMethod}>
              Confirm Selection
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowInfo(true)}>
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Information</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowInfo(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="space-y-2">
              <p>
                <strong>Llama:</strong> This method uses Meta Llama 3.3 70B Instruct Turbo text2text model, which shouldn't even become a translator machine at a first place lmao. However, this is the only free lightweight + accurate + context based model i can find.
              </p>
              <p>
                <strong>DeepL:</strong> Yea DeepL, currently the best machine for translating manga. However, for you to use this, you need to have your DeepL API key. You can get it by registering to DeepL API. This method is more accurate and faster than Llama, but it is free, but you need to.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationMethodModal;