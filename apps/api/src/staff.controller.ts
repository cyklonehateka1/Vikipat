import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { STAFF_ROLES } from '@vikipat/domain';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';
import { CreateStaffDto, UpdateStaffDto } from './staff.dto';
import { StaffService } from './staff.service';

@Controller('admin/staff')
@UseGuards(AuthGuard, PasswordChangedGuard, CsrfGuard, AdminOnlyGuard)
export class StaffController {
  constructor(private staff: StaffService) {}
  @Get() async list() { return {staff: await this.staff.list(), roles: STAFF_ROLES}; }
  @Post() create(@Body() dto: CreateStaffDto, @Req() request: Request) { return this.staff.create(dto, request.user!.email); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffDto, @Req() request: Request) { return this.staff.update(id, dto, request.user!.id, request.user!.email); }
}
