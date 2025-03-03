"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import axios from "axios"
import { Button } from "./components/ui/button"
import { Textarea } from "./components/ui/textarea"
import { Upload, RefreshCw, Crop, HelpCircle } from "lucide-react"
import Navbar from "./components/navbar"
import ImageSelector from "./components/imageselector"
import TutorialButton from "./components/tutorialbutton"

const API_BASE_URL = "http://localhost:5000"

export default function MangaReader() {
  const [raw, setRaw] = useState("")
  const [translated, setTranslated] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [boxesPage, setBoxesPage] = useState<{ x: number; y: number; width: number; height: number ; text:string }[][]>([])
  const [activeBoxIndex, setActiveBoxIndex] = useState<{ imageIndex: number; boxIndex: number } | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", files[0])

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const newImages = response.data.images.map((path: string) => `${API_BASE_URL}${path}`)
      setImages(newImages)
      setBoxesPage(newImages.map(() => []));
    } catch (error) {
      console.error("Error uploading file:", error)
      setError("Error uploading file. Please try again.")
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_BASE_URL}/clear`)
      if (response.status === 200) {
        console.log(response.data.message)
        setImages([])
      } else {
        console.error("Failed to clear files:", response.data.error)
        alert("Failed to clear uploaded files.")
      }
    } catch (error) {
      console.error("Error refreshing images:", error)
      setError("Error refreshing images. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCacheRefresh = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_BASE_URL}/clear_cache`)
      if (response.status === 200) {
        console.log(response.data.message)
        setRaw("")
        setTranslated("")
      } else {
        console.error("Failed to clear translation cache:", response.data.error)
        alert("Failed to clear cache translation cache.")
      }
    } catch (error) {
      console.error("Error clearing translation cache:", error)
      setError("Error clearing translation cache. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleRegionSelect = useCallback(
    async (region: { x: number; y: number; width: number; height: number; text: string }, imageIndex: number) => {
      setError(null)

      try {
        const response = await axios.post(`${API_BASE_URL}/process_region`, {
          image: images[imageIndex],
          region: region,
        })

        console.log("bef : ", boxesPage[imageIndex]);

        console.log("region : ", region);
        console.log("imageIndex : ", imageIndex);

        setBoxesPage((prev) => {
            const newBoxesPage = prev.map((page, idx) =>
                idx === imageIndex ? [...page, { ...region, text: (response.data.text + "\n" + response.data.translated_text) || "" }] : page
            );

            console.log("aft : ", newBoxesPage[imageIndex]);
            return newBoxesPage;
        });
        
        console.log("aft : ", boxesPage[imageIndex]);
      
        // Handle the response from the backend
        setRaw((prevRaw) => prevRaw + response.data.text + "\n");
        setTranslated((prevTranslated) => prevTranslated + response.data.translated_text + "\n");

      } catch (error) {
        console.error("Error processing region:", error)
        setError("Error processing region. Please try again.")
      } 
    },
    [images],
  )

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <div className="flex flex-col md:flex-row flex-grow">
        {/* Manga Reader Section (70%) */}
        <div className="w-full md:w-[70%] p-4 flex flex-col">
          {/* Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 items-center">
              <Button variant="outline" onClick={triggerFileUpload} className="flex items-center gap-2" title="Upload a zip file or image (jpg, png, jpeg, webp, etc.)">
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".zip,image/*"
                className="hidden"
              />
            </div>
            <div className="flex gap-2">
              {isSelecting === true && (<Button variant="outline" size="icon" onClick={() => setIsSelecting(!isSelecting)} className="bg-gray-300">
                <Crop className="h-4 w-4" />
                <span className="sr-only">Select Region</span>
              </Button>
              )}
              {isSelecting === false && (<Button variant="outline" size="icon" onClick={() => setIsSelecting(!isSelecting)}>
                <Crop className="h-4 w-4" />
                <span className="sr-only">Select Region</span>
              </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} title="Refresh the page loaded">
                <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="sr-only">Refresh</span>
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsTutorialOpen(true)}>
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only">Tutorial</span>
              </Button>
            </div>
          </div>

          <div className="relative flex-1 flex flex-col">
            {/* Manga Display - Vertical Scroll */}
            <div className="flex-1 relative flex flex-col items-center bg-gray-100 rounded-lg overflow-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-2" />
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : error ? (
                <p className="text-red-500 py-8">{error}</p>
              ) : images.length > 0 ? (
                <div className="w-full">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className="mb-4 w-full flex justify-center relative"
                      style={{ position: "relative" }}
                    >
                      <ImageSelector
                        src={image}
                        alt={`Manga page ${index + 1}`}
                        className="object-contain max-w-full max-h-full"
                        onRegionSelect={(region) => handleRegionSelect(region, index)}
                        isSelecting={isSelecting}
                      />
                      {boxesPage[index]?.map((box, i) => {
                        // Get the image element using a ref-based approach
                        const imageElement = document.querySelector(`img[alt='Manga page ${index + 1}']`) as HTMLImageElement;
                        if (!imageElement) return null;

                        const imageRect = imageElement.getBoundingClientRect();
                        
                        // Calculate scaling factors based on the actual image size
                        const scaleX = imageRect.width / imageElement.naturalWidth;
                        const scaleY = imageRect.height / imageElement.naturalHeight;

                        // Calculate the correct position and size of the box
                        const scaledBox = {
                          x: box.x*scaleX - 32.5*window.screen.width/100,
                          y: box.y * scaleY + imageRect.top - imageElement.parentElement!.getBoundingClientRect().top,
                          width: box.width * scaleX,
                          height: box.height * scaleY,
                        };

                        const isActive = activeBoxIndex?.imageIndex === index && activeBoxIndex?.boxIndex === i;

                        const isRight = (box.x + box.width + 200) < window.screen.width * 0.6;
                        console.log(box.x + box.width + 200);
                        console.log(box.x);
                        console.log(box.width);
                        console.log(window.screen.width * 0.6);
                        const popupStyle = {
                            top: `${scaledBox.y}px`,
                            left: isRight
                                ? `${scaledBox.x + scaledBox.width + 10}px`
                                : `${scaledBox.x - 160}px`, // 160px is the estimated width of the pop-up
                            zIndex: 30,
                            minWidth: "150px",
                        };

                        return (
                          <div key={`box-container-${index}-${i}`} className="absolute" style={{ zIndex: 20 }}>
                            {/* Box overlay */}
                            <button
                              className="absolute bg-gray-500 bg-opacity-30 border border-gray-700"
                              style={{
                                top: `${scaledBox.y}px`,
                                left: `${scaledBox.x}px`,
                                width: `${scaledBox.width}px`,
                                height: `${scaledBox.height}px`,
                                zIndex: 20,
                              }}
                              onClick={() => {
                                  if (isActive) {
                                      setActiveBoxIndex(null); // Close the pop-up if the same button is clicked
                                  } else {
                                      setActiveBoxIndex({ imageIndex: index, boxIndex: i });
                                  }
                              }}
                            />

                            {isActive && (
                                <div
                                    className="absolute bg-white shadow-md border-2 border-black p-2 rounded-md"
                                    style={popupStyle}
                                >
                                    <h3 className="text-sm font-bold m-1 z-">Box Info</h3>
                                    <p className="mt-3 mb-3" style={{ whiteSpace: "pre-line" }}>{box.text}</p>
                                    <Button variant="outline" size="sm" onClick={() => setActiveBoxIndex(null)}>
                                        Close
                                    </Button>
                                </div>
                            )}                           
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

              ) : (
                <p className="text-gray-500 py-8">No images uploaded yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section (30%) */}
        <div className="w-full md:w-[30%] p-4 border-t md:border-t-0 md:border-l border-gray-200 h-screen overflow-y-auto fixed top- right-0">
          <div className="flex items-center gap-5 mb-2">
            <h2 className="text-xl font-bold">Raw</h2>
            <Button
              variant="outline"
              size="icon"
              title="Refresh translation cache"
              onClick={handleCacheRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>

          <div className="flex flex-col h-[30vh]">
            <Textarea
              placeholder="The raw text will be displayed here..."
              className="flex-1 min-h-[300px] resize-none"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>

          <div className="flex flex-col h-[30vh] mt-4">
            <h2 className="text-xl font-bold mb-2">Eng</h2>
            <Textarea
              placeholder="The translated text will be displayed here..."
              className="flex-1 min-h-[300px] resize-none"
              value={translated}
              onChange={(e) => setTranslated(e.target.value)}
            />
          </div>
        </div>
      </div>
      <TutorialButton isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  )
}