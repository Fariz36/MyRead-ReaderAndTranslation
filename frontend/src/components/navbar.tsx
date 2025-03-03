import React from "react";
import { Button } from "./ui/button";

interface NavbarProps {
  onWidthView: () => void;
  onHeightView: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onWidthView, onHeightView }) => {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold"> Manga Reader </h1>
        <div className="space-x-2">
          <Button onClick={onWidthView} variant="outline" size="sm">
            Width View
          </Button>
          <Button onClick={onHeightView} variant="outline" size="sm">
            Height View
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
