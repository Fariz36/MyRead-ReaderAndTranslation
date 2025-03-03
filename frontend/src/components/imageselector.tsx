"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface ImageSelectorProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onRegionSelect: (region: { x: number; y: number; width: number; height: number }) => void
  isSelecting: boolean
}

const ImageSelector: React.FC<ImageSelectorProps> = ({ onRegionSelect, isSelecting, ...props }) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSelecting) {
      setStartPos(null)
      setEndPos(null)
      setIsDragging(false)
    }
  }, [isSelecting])

  useEffect(() => {
    // Add global mouse up and move handlers
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp()
      }
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && imgRef.current) {
        const position = calculateActualRegion(e.clientX, e.clientY)
        setEndPos(position)
      }
    }

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
      window.addEventListener('mousemove', handleGlobalMouseMove)
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging])

  const calculateActualRegion = (clientX: number, clientY: number) => {
    if (!imgRef.current) return { x: 0, y: 0 }

    const rect = imgRef.current.getBoundingClientRect()
    
    // Calculate coordinates relative to the image
    let relativeX = clientX - rect.left
    let relativeY = clientY - rect.top
    
    // Clamp the values to the image boundaries
    relativeX = Math.max(0, Math.min(relativeX, rect.width))
    relativeY = Math.max(0, Math.min(relativeY, rect.height))
    
    const scaleX = imgRef.current.naturalWidth / rect.width
    const scaleY = imgRef.current.naturalHeight / rect.height

    return {
      x: Math.round(relativeX * scaleX),
      y: Math.round(relativeY * scaleY),
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isSelecting) return
    e.preventDefault() // Prevent default browser behavior
    const position = calculateActualRegion(e.clientX, e.clientY)
    setStartPos(position)
    setEndPos(position) // Set initial end position same as start
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isSelecting || !isDragging) return
    const position = calculateActualRegion(e.clientX, e.clientY)
    setEndPos(position)
  }

  const handleMouseUp = () => {
    if (!isSelecting || !startPos || !endPos) return
    
    setIsDragging(false)
    
    // Only trigger selection if the region has some size
    if (Math.abs(endPos.x - startPos.x) > 5 && Math.abs(endPos.y - startPos.y) > 5) {
      const region = {
        x: Math.min(startPos.x, endPos.x),
        y: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x),
        height: Math.abs(endPos.y - startPos.y),
      }
      onRegionSelect(region)
    }
    
    if (!isSelecting) {
      setStartPos(null)
      setEndPos(null)
    }
  }

  const getDisplayRegion = () => {
    if (!startPos || !endPos || !imgRef.current) return null

    const rect = imgRef.current.getBoundingClientRect()
    const scaleX = rect.width / imgRef.current.naturalWidth
    const scaleY = rect.height / imgRef.current.naturalHeight

    return {
      left: Math.min(startPos.x, endPos.x) * scaleX,
      top: Math.min(startPos.y, endPos.y) * scaleY,
      width: Math.abs(endPos.x - startPos.x) * scaleX,
      height: Math.abs(endPos.y - startPos.y) * scaleY,
    }
  }

  const displayRegion = isDragging && getDisplayRegion()

  return (
    <div className="relative inline-block" ref={containerRef}>
      <img
        alt=""
        {...props}
        ref={imgRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ 
          ...props.style, 
          cursor: isSelecting ? "crosshair" : "default",
          userSelect: "none"  // Prevent text selection
        }}
        draggable={false}  // Prevent dragging the image
      />
      {displayRegion && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
          style={{
            left: displayRegion.left,
            top: displayRegion.top,
            width: displayRegion.width,
            height: displayRegion.height,
          }}
        />
      )}
    </div>
  )
}

export default ImageSelector