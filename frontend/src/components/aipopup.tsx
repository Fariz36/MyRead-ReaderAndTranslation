"use client";

import type React from "react";
import { useState } from "react";
import { X, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";

interface AIMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: "model1" | "model2" | null) => void;
}

const AIMethodModal: React.FC<AIMethodModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [selectedMethod, setSelectedMethod] = useState<"model1" | "model2" | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen) return null;

  const handleMethodSelect = (method: "model1" | "model2") => {
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
    onSelect(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Choose AI Model</h2>
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
              checked={selectedMethod === "model1"}
              onChange={() => handleMethodSelect("model1")}
              className="mr-2"
            />
            <label htmlFor="method1"> Model 1 (Normal) </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="method2"
              name="translationMethod"
              value="method2"
              checked={selectedMethod === "model2"}
              onChange={() => handleMethodSelect("model2")}
              className="mr-2"
            />
            <label htmlFor="method2"> Model 2 (Sensitive) </label>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button onClick={handleConfirm} disabled={!selectedMethod}>
              Start AI Scanning
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
                <strong>Model 1 :</strong> This model intended to only scan "normal bubble text", it is not sensitive to sfx or bubble with irregular shapes. It is also faster than Model 2, but less accurate.
              </p>
              <p>
                <strong>Model 2:</strong> This model intended to scan all types of text, including sfx and irregular shaped bubbles. The speed is actually same as model 1, but this model scan more bubble, resulting in slower processing time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMethodModal;
