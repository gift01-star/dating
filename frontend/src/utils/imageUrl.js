/**
 * Utility function to properly construct image URLs
 * Handles both absolute URLs and relative paths
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function getImageUrl(imagePath) {
  // If it's already an absolute URL, return as is
  if (imagePath?.startsWith('http://') || imagePath?.startsWith('https://')) {
    return imagePath;
  }

  // If it's a relative path starting with /uploads, construct the full URL
  if (imagePath?.startsWith('/uploads')) {
    // Extract the base URL (remove /api if present)
    const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    return `${baseUrl}${imagePath}`;
  }

  // Otherwise return the path as is
  return imagePath;
}

export default getImageUrl;
