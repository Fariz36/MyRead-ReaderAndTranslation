"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import axios from "axios"
import { Button } from "./components/ui/button"
import { Textarea } from "./components/ui/textarea"
import { ChevronLeft, ChevronRight, Upload, RefreshCw, Crop } from "lucide-react"
import Navbar from "./components/navbar"
import ImageSelector from "./components/imageselector"

const API_BASE_URL = "http://localhost:5000"

export default function MangaReader() {
  const [currentPage, setCurrentPage] = useState(1)
  const [raw, setRaw] = useState("")
  const [translated, setTranslated] = useState("")
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"width" | "height">("width")
  const [isSelecting, setIsSelecting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    } else {
      setCurrentPage(1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    } else {
      setCurrentPage(totalPages)
    }
  }

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
      setTotalPages(newImages.length)
      setCurrentPage(1)
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
        setTotalPages(0)
        setCurrentPage(1)
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

  
  const handlePageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPage(Number(e.target.value))
  }

  const handleRegionSelect = useCallback(
    async (region: { x: number; y: number; width: number; height: number }) => {
      setError(null)

      try {
        const response = await axios.post(`${API_BASE_URL}/process_region`, {
          image: images[currentPage - 1],
          region: region,
        })

        // Handle the response from the backend
        setRaw((prevRaw) => prevRaw + response.data.text + "\n");
        setTranslated((prevTranslated) => prevTranslated + response.data.translated_text + "\n");

      } catch (error) {
        console.error("Error processing region:", error)
        setError("Error processing region. Please try again.")
      } 
    },
    [currentPage, images],
  )

  const currentImage = images[currentPage - 1]

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar onWidthView={() => setViewMode("width")} onHeightView={() => setViewMode("height")} />
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
              {images.length > 0 && (
                <select
                  value={currentPage}
                  onChange={handlePageSelect}
                  className="px-2 py-1 rounded-md bg-white border border-gray-300 text-sm font-medium"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <option key={page} value={page}>
                      Page {page}
                    </option>
                  ))}
                </select>
              )}
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
            </div>
          </div>

          <div className="relative flex-1 flex flex-col">
            {/* Manga Display */}
            <div className="flex-1 relative flex flex-col items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-2" />
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : currentImage ? (
                <ImageSelector
                  src={currentImage || "/placeholder.svg"}
                  alt={`Manga page ${currentPage}`}
                  className={`object-contain ${viewMode === "width" ? "w-full" : "h-full"}`}
                  style={viewMode === "height" ? { maxHeight: "calc(100vh - 200px)" } : {}}
                  onRegionSelect={handleRegionSelect}
                  isSelecting={isSelecting}
                />
              ) : (
                <p className="text-gray-500">No images uploaded yet</p>
              )}

              {/* Navigation Controls */}
              {images.length > 0 && (
                <div className="bottom-4 flex justify-center items-center gap-4 mt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prevPage}
                    disabled={isLoading}
                    className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm"
                  >
                    <ChevronLeft className="h-6 w-6" />
                    <span className="sr-only">Previous page</span>
                  </Button>

                  <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextPage}
                    disabled={isLoading}
                    className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm"
                  >
                    <ChevronRight className="h-6 w-6" />
                    <span className="sr-only">Next page</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Section (30%) */}

        <div className="w-full md:w-[30%] p-4 border-t md:border-t-0 md:border-l border-gray-200">
          
          <div className="flex items-center gap-5 mb-2">
            <h2 className="text-xl font-bold">Raw</h2>
            <Button variant="outline" size="icon" title="Refresh translation cache" onClick={handleCacheRefresh} disabled={isLoading}>
              <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
          
          <div className="flex flex-col h-[30%]">
            <Textarea
              placeholder="The raw text will be diplsayed here..."
              className="flex-1 min-h-[300px] resize-none"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>

          <div className="flex flex-col h-[30%] mt-4">
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
    </div>
  )
}

