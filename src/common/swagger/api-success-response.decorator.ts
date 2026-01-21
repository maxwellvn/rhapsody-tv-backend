import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiCreatedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiSuccessResponseDto } from './api-success-response.dto';

type ApiSuccessResponseOptions = {
  description?: string;
  model?: Type<unknown>;
  isArray?: boolean;
};

function buildSchema(options?: ApiSuccessResponseOptions) {
  if (!options?.model) {
    return {
      allOf: [{ $ref: getSchemaPath(ApiSuccessResponseDto) }],
    };
  }

  const dataSchema = options.isArray
    ? { type: 'array', items: { $ref: getSchemaPath(options.model) } }
    : { $ref: getSchemaPath(options.model) };

  return {
    allOf: [
      { $ref: getSchemaPath(ApiSuccessResponseDto) },
      {
        properties: {
          data: dataSchema,
        },
      },
    ],
  };
}

export function ApiOkSuccessResponse(options?: ApiSuccessResponseOptions) {
  return applyDecorators(
    ApiExtraModels(
      ApiSuccessResponseDto,
      ...(options?.model ? [options.model] : []),
    ),
    ApiOkResponse({
      description: options?.description,
      schema: buildSchema(options),
    }),
  );
}

export function ApiCreatedSuccessResponse(options?: ApiSuccessResponseOptions) {
  return applyDecorators(
    ApiExtraModels(
      ApiSuccessResponseDto,
      ...(options?.model ? [options.model] : []),
    ),
    ApiCreatedResponse({
      description: options?.description,
      schema: buildSchema(options),
    }),
  );
}
