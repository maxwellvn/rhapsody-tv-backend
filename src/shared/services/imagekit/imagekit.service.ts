import { Injectable, Logger } from '@nestjs/common';
import ImageKit from 'imagekit';
import { ConfigService } from '@nestjs/config';

export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  contentType: string;
}

@Injectable()
export class ImageKitService {
  private readonly logger = new Logger(ImageKitService.name);
  private readonly imagekit: ImageKit | null = null;
  private readonly isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    const publicKey = this.configService.get<string>('imagekit.publicKey');
    const privateKey = this.configService.get<string>('imagekit.privateKey');
    const urlEndpoint = this.configService.get<string>('imagekit.urlEndpoint');

    if (publicKey && privateKey && urlEndpoint) {
      this.imagekit = new ImageKit({
        publicKey,
        privateKey,
        urlEndpoint,
      });
      this.isConfigured = true;
      this.logger.log('ImageKit initialized successfully');
    } else {
      this.logger.warn(
        'ImageKit credentials not configured - file uploads will be disabled',
      );
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured || !this.imagekit) {
      throw new Error(
        'ImageKit is not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT environment variables.',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<ImageKitUploadResponse> {
    this.ensureConfigured();
    const uploadResult = await this.imagekit!.upload({
      file: file.buffer,
      fileName: file.originalname,
      folder: folder || 'rhapsody-tv',
    });

    const result = uploadResult as {
      fileId: string;
      name: string;
      url: string;
      thumbnailUrl?: string;
      height?: number;
      width?: number;
      size: number;
      mimeType?: string;
    };

    return {
      fileId: result.fileId,
      name: result.name,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl || result.url,
      height: result.height || 0,
      width: result.width || 0,
      size: result.size,
      contentType: result.mimeType || 'application/octet-stream',
    };
  }

  async uploadFileFromUrl(
    url: string,
    fileName: string,
    folder?: string,
  ): Promise<ImageKitUploadResponse> {
    this.ensureConfigured();
    const uploadResult = await this.imagekit!.upload({
      file: url,
      fileName: fileName,
      folder: folder || 'rhapsody-tv',
    });

    const result = uploadResult as {
      fileId: string;
      name: string;
      url: string;
      thumbnailUrl?: string;
      height?: number;
      width?: number;
      size: number;
      mimeType?: string;
    };

    return {
      fileId: result.fileId,
      name: result.name,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl || result.url,
      height: result.height || 0,
      width: result.width || 0,
      size: result.size,
      contentType: result.mimeType || 'application/octet-stream',
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    this.ensureConfigured();
    await this.imagekit!.deleteFile(fileId);
  }

  getAuthenticationParameters() {
    this.ensureConfigured();
    return this.imagekit!.getAuthenticationParameters();
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }

  getUrlEndpoint(): string {
    return this.configService.get<string>('imagekit.urlEndpoint') || '';
  }
}
