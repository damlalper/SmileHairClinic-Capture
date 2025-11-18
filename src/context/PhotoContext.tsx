import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CapturedPhoto } from '../types';

interface PhotoContextType {
  photos: CapturedPhoto[];
  addPhoto: (photo: CapturedPhoto) => void;
  updatePhoto: (photo: CapturedPhoto) => void;
  clearPhotos: () => void;
  getPhotoByAngle: (angle: string) => CapturedPhoto | undefined;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function PhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  const addPhoto = (photo: CapturedPhoto) => {
    setPhotos((prev) => {
      const existingIndex = prev.findIndex((p) => p.angle === photo.angle);
      if (existingIndex >= 0) {
        // Replace existing photo for this angle
        const newPhotos = [...prev];
        newPhotos[existingIndex] = photo;
        return newPhotos;
      } else {
        // Add new photo
        return [...prev, photo];
      }
    });
  };

  const updatePhoto = (photo: CapturedPhoto) => {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.angle === photo.angle);
      if (index >= 0) {
        const newPhotos = [...prev];
        newPhotos[index] = photo;
        return newPhotos;
      }
      return prev;
    });
  };

  const clearPhotos = () => {
    setPhotos([]);
  };

  const getPhotoByAngle = (angle: string) => {
    return photos.find((p) => p.angle === angle);
  };

  return (
    <PhotoContext.Provider
      value={{
        photos,
        addPhoto,
        updatePhoto,
        clearPhotos,
        getPhotoByAngle,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
}

export function usePhotos() {
  const context = useContext(PhotoContext);
  if (context === undefined) {
    throw new Error('usePhotos must be used within a PhotoProvider');
  }
  return context;
}
