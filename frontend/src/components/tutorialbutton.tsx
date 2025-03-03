import React from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";

interface TutorialButtonProps {
  isOpen: boolean;
  onClose: () => void;
}

const TutorialButton: React.FC<TutorialButtonProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">How to Use ?</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <div className="space-y-4">
          <p>
            <strong>1. Upload Files:</strong> Click the "Upload Files" button to select and upload your manga images or a zip file
            containing images. Dont worry if your zip files contain another file type or subfolders, they will be ignored.
          </p>
          <p>
            <strong>2. View Manga:</strong> Scroll through the uploaded images in the main panel. This app doesn't support single-page view or height-fixed view (because the creator is so lazy lmao)
          </p>
          <p>
            <strong>3. Select Region:</strong> Click the crop icon to enter selection mode. Click and drag on an image to select a
            region for processing. You can select multiple region at once, but it will be processed one by one.
          </p>
          <p>
            <strong>4. Refresh Page:</strong> Refresh the page will erase all uploaded images. If you click the refresh button by accident, you can re-upload the images again.
          </p>
          <p>
            <strong>5. Refresh Translation:</strong> The translation will make use of before translated text to improve the accuracy, context, and tone. If you moving to another manga or another context, it is recommended for you to refresh the translation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TutorialButton;
