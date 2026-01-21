import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ImageKitService } from '../../../shared/services/imagekit/imagekit.service';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import { ApiOkSuccessResponse } from '../../../common/swagger';
import { UploadResponseDto } from '../dto';

@ApiTags('Admin Upload')
@ApiBearerAuth()
@Controller('admin/upload')
export class AdminUploadController {
  constructor(private readonly imageKitService: ImageKitService) {}

  @Post('image')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload an image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkSuccessResponse({
    description: 'Image uploaded successfully',
    model: UploadResponseDto,
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.imageKitService.uploadFile(
      file,
      'rhapsody-tv/images',
    );

    return {
      success: true,
      message: 'Image uploaded successfully',
      data: {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        width: result.width,
        height: result.height,
        size: result.size,
        contentType: result.contentType,
      },
    };
  }

  @Post('video')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload a video (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkSuccessResponse({
    description: 'Video uploaded successfully',
    model: UploadResponseDto,
  })
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    const result = await this.imageKitService.uploadFile(
      file,
      'rhapsody-tv/videos',
    );

    return {
      success: true,
      message: 'Video uploaded successfully',
      data: {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        width: result.width,
        height: result.height,
        size: result.size,
        contentType: result.contentType,
      },
    };
  }

  @Post('from-url')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload a file from URL (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'File uploaded successfully',
    model: UploadResponseDto,
  })
  async uploadFromUrl(
    @Body() body: { url: string; fileName: string; folder?: string },
  ) {
    const result = await this.imageKitService.uploadFileFromUrl(
      body.url,
      body.fileName,
      body.folder || 'rhapsody-tv',
    );

    return {
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        width: result.width,
        height: result.height,
        size: result.size,
        contentType: result.contentType,
      },
    };
  }
}
