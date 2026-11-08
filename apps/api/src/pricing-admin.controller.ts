import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CreateServiceRuleDto, SavePricingDraftDto, TestPricingDraftDto, UpdatePricingCopyDto } from './dto';
import { PricingAdminService } from './pricing-admin.service';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';

@Controller('admin/pricing')
@UseGuards(AuthGuard, PasswordChangedGuard, CsrfGuard, AdminOnlyGuard)
export class PricingAdminController {
  constructor(private readonly pricing: PricingAdminService) {}

  @Get('rules') list() { return this.pricing.list(); }
  @Post('rules') create(@Req() req: Request, @Body() dto: CreateServiceRuleDto) { return this.pricing.create(dto, req.user!.email); }
  @Get('rules/:id/history') history(@Param('id') id: string) { return this.pricing.history(id); }
  @Patch('rules/:id/draft') saveDraft(@Req() req: Request, @Param('id') id: string, @Body() dto: SavePricingDraftDto) { return this.pricing.saveDraft(id, dto, req.user!.email); }
  @Patch('rules/:id/copy') updateCopy(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePricingCopyDto) { return this.pricing.updateCopy(id, dto, req.user!.email); }
  @Post('drafts/:id/test') test(@Param('id') id: string, @Body() dto: TestPricingDraftDto) { return this.pricing.testDraft(id, dto); }
  @Post('drafts/:id/publish') publish(@Req() req: Request, @Param('id') id: string) { return this.pricing.publish(id, req.user!.email); }
}
