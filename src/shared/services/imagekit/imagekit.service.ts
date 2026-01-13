import { Injectable } from '@nestjs/common';
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
  private readonly imagekit: ImageKit;

  constructor(private readonly configService: ConfigService) {
    this.imagekit = new ImageKit({
      publicKey: this.configService.get<string>('imagekit.publicKey') || '',
      privateKey: this.configService.get<string>('imagekit.privateKey') || '',
      urlEndpoint: this.configService.get<string>('imagekit.urlEndpoint') || '',
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<ImageKitUploadResponse> {
    const uploadResult = await this.imagekit.upload({
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
    const uploadResult = await this.imagekit.upload({
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
    await this.imagekit.deleteFile(fileId);
  }

  getAuthenticationParameters() {
    return this.imagekit.getAuthenticationParameters();
  }

  getUrlEndpoint(): string {
    return this.configService.get<string>('imagekit.urlEndpoint') || '';
  }
}
