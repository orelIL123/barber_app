import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: ImageManipulator.SaveFormat;
}

export class ImageOptimizer {
  // Default compression settings for different image types
  static readonly PRESETS = {
    PROFILE: {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.8,
      format: ImageManipulator.SaveFormat.JPEG
    },
    GALLERY: {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.85,
      format: ImageManipulator.SaveFormat.JPEG
    },
    ATMOSPHERE: {
      maxWidth: 1200,
      maxHeight: 800,
      quality: 0.9,
      format: ImageManipulator.SaveFormat.JPEG
    },
    THUMBNAIL: {
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.7,
      format: ImageManipulator.SaveFormat.JPEG
    }
  } as const;

  /**
   * Compresses an image using the specified options
   */
  static async compressImage(
    imageUri: string, 
    options: CompressionOptions = ImageOptimizer.PRESETS.GALLERY
  ): Promise<string> {
    try {
      console.log('🖼️ Starting image compression...', {
        originalUri: imageUri,
        options
      });

      const actions: ImageManipulator.Action[] = [];

      // Resize if dimensions are specified
      if (options.maxWidth || options.maxHeight) {
        actions.push({
          resize: {
            width: options.maxWidth,
            height: options.maxHeight
          }
        });
      }

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: options.quality || 0.8,
          format: options.format || ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );

      console.log('✅ Image compression completed', {
        originalUri: imageUri,
        compressedUri: result.uri,
        newWidth: result.width,
        newHeight: result.height
      });

      return result.uri;
    } catch (error) {
      console.error('❌ Image compression failed:', error);
      // Return original URI if compression fails
      return imageUri;
    }
  }

  /**
   * Pick and compress an image from gallery
   */
  static async pickAndCompressImage(
    preset: keyof typeof ImageOptimizer.PRESETS = 'GALLERY'
  ): Promise<string | null> {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Gallery permission denied');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: preset === 'PROFILE' ? [1, 1] : undefined,
        quality: 1, // Pick at full quality, we'll compress later
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const selectedImage = result.assets[0];
      console.log('📱 Image picked from gallery:', {
        uri: selectedImage.uri,
        width: selectedImage.width,
        height: selectedImage.height,
        fileSize: selectedImage.fileSize
      });

      // Compress the picked image
      const compressedUri = await ImageOptimizer.compressImage(
        selectedImage.uri,
        ImageOptimizer.PRESETS[preset]
      );

      return compressedUri;
    } catch (error) {
      console.error('Error picking and compressing image:', error);
      throw error;
    }
  }

  /**
   * Take and compress a photo from camera
   */
  static async takeAndCompressPhoto(
    preset: keyof typeof ImageOptimizer.PRESETS = 'GALLERY'
  ): Promise<string | null> {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Camera permission denied');
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: preset === 'PROFILE' ? [1, 1] : undefined,
        quality: 1, // Capture at full quality, we'll compress later
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const capturedImage = result.assets[0];
      console.log('📸 Photo captured:', {
        uri: capturedImage.uri,
        width: capturedImage.width,
        height: capturedImage.height,
        fileSize: capturedImage.fileSize
      });

      // Compress the captured photo
      const compressedUri = await ImageOptimizer.compressImage(
        capturedImage.uri,
        ImageOptimizer.PRESETS[preset]
      );

      return compressedUri;
    } catch (error) {
      console.error('Error taking and compressing photo:', error);
      throw error;
    }
  }

  /**
   * Generate a thumbnail from an image
   */
  static async generateThumbnail(imageUri: string): Promise<string> {
    return ImageOptimizer.compressImage(imageUri, ImageOptimizer.PRESETS.THUMBNAIL);
  }

  /**
   * Get optimized image dimensions while maintaining aspect ratio
   */
  static getOptimizedDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Scale down if needed
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Estimate file size reduction
   */
  static estimateCompressionRatio(
    preset: keyof typeof ImageOptimizer.PRESETS
  ): number {
    const presetConfig = ImageOptimizer.PRESETS[preset];
    // Rough estimation based on quality and typical compression ratios
    return presetConfig.quality * 0.7; // Typically 30-50% size reduction
  }
}

// Convenience functions
export const compressProfileImage = (uri: string) => 
  ImageOptimizer.compressImage(uri, ImageOptimizer.PRESETS.PROFILE);

export const compressGalleryImage = (uri: string) => 
  ImageOptimizer.compressImage(uri, ImageOptimizer.PRESETS.GALLERY);

export const compressAtmosphereImage = (uri: string) => 
  ImageOptimizer.compressImage(uri, ImageOptimizer.PRESETS.ATMOSPHERE);

export const pickGalleryImage = () => 
  ImageOptimizer.pickAndCompressImage('GALLERY');

export const pickProfileImage = () => 
  ImageOptimizer.pickAndCompressImage('PROFILE');

export const takePhoto = () => 
  ImageOptimizer.takeAndCompressPhoto('GALLERY');