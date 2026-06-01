import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Role } from "../enums/role.enum";


@Injectable() 
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const paramId = +request.params.id;

    if (!user) {
      throw new ForbiddenException('No user found');
    }

    const isOwner = user.sub === paramId;

    const isAdminOrModerator =
      user.role === Role.ADMIN ||
      user.role === Role.MODERATOR;

    if (!isOwner && !isAdminOrModerator) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}