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

  // If it's a relative path starting with /uploads, prepend the API base URL
  if (imagePath?.startsWith('/uploads')) {
    // Extract the base URL (without /api)
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${imagePath}`;
  }

  // Otherwise return the path as is
  return imagePath;
}

export default getImageUrl;
