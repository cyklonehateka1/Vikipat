import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { CustomerService } from './customer.service';
import { PeopleService } from './people.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import {
  ClockInDto,
  ClockOutDto,
  CreateEmployeeDto,
  CreatePayrollRunDto,
  RecordAttendanceDto,
  UpdateEmployeeDto,
  UpdatePayrollStatusDto,
  UpdatePayslipDto,
} from './people.dto';
import { AdminOnlyGuard, AuthGuard, CsrfGuard, PasswordChangedGuard } from './security';

@Controller('admin/people')
@UseGuards(AuthGuard, PasswordChangedGuard, CsrfGuard, AdminOnlyGuard)
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Get('employees') employees(@Query('includeInactive') includeInactive?: string) {
    return this.people.listEmployees(includeInactive === 'true');
  }
  @Post('employees') createEmployee(@Req() req: Request, @Body() dto: CreateEmployeeDto) {
    return this.people.createEmployee(dto, req.user!.email);
  }
  @Patch('employees/:id') updateEmployee(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.people.updateEmployee(id, dto, req.user!.email);
  }

  @Get('attendance') attendance(@Query('from') from?: string, @Query('to') to?: string, @Query('employeeId') employeeId?: string) {
    return this.people.listAttendance(from, to, employeeId);
  }
  @Post('attendance/clock-in') clockIn(@Req() req: Request, @Body() dto: ClockInDto) {
    return this.people.clockIn(dto, req.user!.email);
  }
  @Post('attendance/clock-out') clockOut(@Req() req: Request, @Body() dto: ClockOutDto) {
    return this.people.clockOut(dto.employeeId, req.user!.email);
  }
  @Post('attendance') record(@Req() req: Request, @Body() dto: RecordAttendanceDto) {
    return this.people.recordAttendance(dto, req.user!.email);
  }

  @Patch('attendance/:id') correct(@Param('id',ParseUUIDPipe) id:string,@Body() dto:RecordAttendanceDto,@Req() r:Request){return this.people.recordAttendance(dto,r.user!.email,id);}
  @Post('payslips/:id/email') emailPayslip(@Param('id',ParseUUIDPipe) id:string,@Req() r:Request){return this.people.emailPayslip(id,r.user!.email);}
  @Get('payroll') payrollRuns() {
    return this.people.listPayrollRuns();
  }
  @Get('payroll/:id') payrollRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.people.payrollRun(id);
  }
  @Post('payroll') createPayroll(@Req() req: Request, @Body() dto: CreatePayrollRunDto) {
    return this.people.createPayrollRun(dto, req.user!.email);
  }
  @Patch('payroll/:id/status') payrollStatus(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePayrollStatusDto) {
    return this.people.updatePayrollStatus(id, dto.status, req.user!.email);
  }
  @Patch('payslips/:id') updatePayslip(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePayslipDto) {
    return this.people.updatePayslip(id, dto, req.user!.email);
  }

  @Get('performance') performance(@Query('from') from?: string, @Query('to') to?: string) {
    return this.people.performance(from, to);
  }
}

@Controller('admin/analytics')
@UseGuards(AuthGuard, PasswordChangedGuard, CsrfGuard, AdminOnlyGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly reconciliation: PaymentReconciliationService,
  ) {}

  @Get() overview(@Query('days') days?: string,@Query('from') from?:string,@Query('to') to?:string) {
    const window = Number(days);
    return this.analytics.overview(days===undefined?30:window,from,to);
  }
  @Post('email') email(@Req() r:Request){return this.analytics.emailReport(r.user!.email);}
  @Get('insights') insights() {
    return this.analytics.insights();
  }
  /** Forces a payment sweep instead of waiting for the next cron tick. */
  @Post('reconcile') reconcile() {
    return this.reconciliation.runNow();
  }
}

@Controller('admin/customers')
@UseGuards(AuthGuard, PasswordChangedGuard, CsrfGuard, AdminOnlyGuard)
export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  @Get() list(@Query('q') q?: string) {
    return this.customers.list(q || '');
  }
  @Get(':id') one(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.one(id);
  }
}
