import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post('paystack/webhook')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  paystackWebhook(@Req() request: Request, @Headers('x-paystack-signature') signature: string | undefined, @Body() payload: unknown) {
    this.payments.verifyPaystackSignature(request.rawBody, signature);
    return this.payments.handlePaystackEvent(payload);
  }

  @Get('paystack/verify/:reference')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verify(@Param('reference') reference: string) {
    return this.payments.verifyPaystackReference(reference);
  }
}

@Controller('admin/payments')
@UseGuards(AuthGuard, PasswordChangedGuard, CsrfGuard, AdminOnlyGuard)
export class AdminPaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Get()
  list() {
    return this.payments.listAdminPayments();
  }

  @Get('summary')
  summary() {
    return this.payments.adminPaymentSummary();
  }
}
