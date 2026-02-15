import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaTrash, FaTimes } from 'react-icons/fa';
import getImageUrl from '../utils/imageUrl';

function PhotoGallery({ photos, onDeletePhoto }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [photoErrors, setPhotoErrors] = useState({});

  const handlePrevious = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleDelete = async () => {
    const photo = photos[currentPhotoIndex];
    if (window.confirm('Delete this photo?')) {
      await onDeletePhoto(photo.publicId);
      // Move to previous photo or close modal if no photos left
      if (photos.length <= 1) {
        setShowModal(false);
      } else if (currentPhotoIndex >= photos.length - 1) {
        setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1));
      }
    }
  };

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {photos.map((photo, idx) => (
          <div 
            key={photo.publicId} 
            className="relative group bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition"
            onClick={() => {
              setCurrentPhotoIndex(idx);
              setShowModal(true);
            }}
          >
            {photoErrors[photo.publicId] ? (
              <div className="w-full h-48 bg-gray-300 flex items-center justify-center text-gray-600 text-center p-2 rounded-lg">
                <div>
                  <p className="text-sm font-semibold">📸 Photo not found</p>
                  <p className="text-xs text-gray-500 mt-1">Please reupload</p>
                </div>
              </div>
            ) : (
              <img
                src={getImageUrl(photo.url)}
                alt={`Photo ${idx + 1}`}
                className="w-full h-48 object-cover rounded-lg bg-gray-200 hover:scale-105 transition"
                onError={() => setPhotoErrors(prev => ({ ...prev, [photo.publicId]: true }))}
                loading="lazy"
              />
            )}
            {idx === 0 && (
              <span className="absolute top-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded font-semibold">
                Main
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePhoto(photo.publicId);
              }}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"
              title="Delete photo"
            >
              <FaTrash size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Full Screen Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 bg-white text-black rounded-full p-2 hover:bg-gray-200 transition z-10"
              title="Close"
            >
              <FaTimes size={24} />
            </button>

            {/* Main Photo Display */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
              {photoErrors[currentPhoto.publicId] ? (
                <div className="w-full h-96 bg-gray-700 flex items-center justify-center text-white text-center">
                  <div>
                    <p className="text-lg font-semibold">📸 Photo not found</p>
                    <p className="text-sm text-gray-300 mt-2">This photo may have been deleted or moved.</p>
                  </div>
                </div>
              ) : (
                <img
                  src={getImageUrl(currentPhoto.url)}
                  alt={`Photo ${currentPhotoIndex + 1}`}
                  className="max-w-full max-h-96 object-contain"
                  onError={() => setPhotoErrors(prev => ({ ...prev, [currentPhoto.publicId]: true }))}
                />
              )}

              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white text-black rounded-full p-3 hover:bg-gray-200 transition shadow-lg"
                    title="Previous photo"
                  >
                    <FaChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white text-black rounded-full p-3 hover:bg-gray-200 transition shadow-lg"
                    title="Next photo"
                  >
                    <FaChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className="absolute bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                title="Delete photo"
              >
                <FaTrash size={16} />
                Delete
              </button>
            </div>

            {/* Photo Counter and Thumbnail Scroll */}
            {photos.length > 1 && (
              <div className="mt-4">
                <div className="text-center text-white mb-4 font-semibold">
                  {currentPhotoIndex + 1} of {photos.length}
                </div>
                
                {/* Horizontal Thumbnail Scroll */}
                <div className="overflow-x-auto flex gap-2 pb-2">
                  {photos.map((photo, idx) => (
                    <button
                      key={photo.publicId}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                        idx === currentPhotoIndex 
                          ? 'border-pink-500 shadow-lg' 
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      title={`Photo ${idx + 1}`}
                    >
                      {photoErrors[photo.publicId] ? (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white text-xs">
                          ✕
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(photo.url)}
                          alt={`Thumb ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={() => setPhotoErrors(prev => ({ ...prev, [photo.publicId]: true }))}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PhotoGallery;
