import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserDocument } from '../../modules/user/schemas/user.schema';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<
        Request & { user?: UserDocument & Record<string, unknown> }
      >();
    const user = request.user;

    if (!data) {
      return user;
    }

    return user?.[data];
  },
);
