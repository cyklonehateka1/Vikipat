import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CreateServiceRuleDto, SavePricingDraftDto, TestPricingDraftDto, UpdatePricingCopyDto } from './dto';
import { PricingAdminService } from './pricing-admin.service';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';

@Controller('admin/pricing')
@UseGuards(AuthGuard, PasswordChangedGuard, CsrfGuard)
export class PricingAdminController {
  constructor(private readonly pricing: PricingAdminService) {}

  // Read-only: also used by staff to price counter-order line items, so it's gated
  // on orders.manage rather than AdminOnlyGuard like every other method here.
  @Get('rules') list(@Req() req: Request) { if (!req.user!.permissions.includes('orders.manage')) throw new ForbiddenException('Order management permission required'); return this.pricing.list(); }
  @Post('rules') @UseGuards(AdminOnlyGuard) create(@Req() req: Request, @Body() dto: CreateServiceRuleDto) { return this.pricing.create(dto, req.user!.email); }
  @Get('rules/:id/history') @UseGuards(AdminOnlyGuard) history(@Param('id') id: string) { return this.pricing.history(id); }
  @Patch('rules/:id/draft') @UseGuards(AdminOnlyGuard) saveDraft(@Req() req: Request, @Param('id') id: string, @Body() dto: SavePricingDraftDto) { return this.pricing.saveDraft(id, dto, req.user!.email); }
  @Patch('rules/:id/copy') @UseGuards(AdminOnlyGuard) updateCopy(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePricingCopyDto) { return this.pricing.updateCopy(id, dto, req.user!.email); }
  @Post('drafts/:id/test') @UseGuards(AdminOnlyGuard) test(@Param('id') id: string, @Body() dto: TestPricingDraftDto) { return this.pricing.testDraft(id, dto); }
  @Post('drafts/:id/publish') @UseGuards(AdminOnlyGuard) publish(@Req() req: Request, @Param('id') id: string) { return this.pricing.publish(id, req.user!.email); }
}
