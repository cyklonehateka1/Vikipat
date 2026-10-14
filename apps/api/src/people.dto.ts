import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const PAY_TYPES = ['monthly', 'daily', 'hourly'] as const;
const EMPLOYMENT_STATUSES = ['active', 'suspended', 'terminated'] as const;
const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'leave', 'holiday'] as const;
const DEPARTMENTS = ['production', 'design', 'sales', 'dispatch', 'admin', 'finance'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEmployeeDto {
  @IsOptional() @IsString() @Length(3, 40) staffNumber?: string;
  @IsString() @Length(2, 120) fullName!: string;
  @IsOptional() @IsString() @Length(0, 254) email?: string;
  @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{0,24}$/) phone?: string;
  @IsOptional() @IsString() @Length(0, 60) userId?: string;
  @IsOptional() @IsString() @Length(0, 80) jobTitle?: string;
  @IsOptional() @IsIn(DEPARTMENTS) department?: string;
  @IsIn(PAY_TYPES) payType!: 'monthly' | 'daily' | 'hourly';
  @IsInt() @Min(0) @Max(100_000_000) payRatePesewas!: number;
  @IsOptional() @IsString() @Length(0, 80) bankName?: string;
  @IsOptional() @IsString() @Length(0, 40) bankAccount?: string;
  @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{0,24}$/) momoNumber?: string;
  @IsOptional() @IsString() @Length(0, 40) ssnitNumber?: string;
  @IsOptional() @IsString() @Matches(ISO_DATE) hiredOn?: string;
  @IsOptional() @IsString() @Length(0, 1000) notes?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @Length(2, 120) fullName?: string;
  @IsOptional() @IsString() @Length(0, 254) email?: string;
  @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{0,24}$/) phone?: string;
  @IsOptional() @IsString() @Length(0, 60) userId?: string;
  @IsOptional() @IsString() @Length(0, 80) jobTitle?: string;
  @IsOptional() @IsIn(DEPARTMENTS) department?: string;
  @IsOptional() @IsIn(EMPLOYMENT_STATUSES) employmentStatus?: 'active' | 'suspended' | 'terminated';
  @IsOptional() @IsIn(PAY_TYPES) payType?: 'monthly' | 'daily' | 'hourly';
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) payRatePesewas?: number;
  @IsOptional() @IsString() @Length(0, 80) bankName?: string;
  @IsOptional() @IsString() @Length(0, 40) bankAccount?: string;
  @IsOptional() @IsString() @Matches(/^[+0-9 ()-]{0,24}$/) momoNumber?: string;
  @IsOptional() @IsString() @Length(0, 40) ssnitNumber?: string;
  @IsOptional() @IsString() @Length(0, 1000) notes?: string;
}

export class ClockInDto {
  @IsString() @Length(10, 60) employeeId!: string;
  @IsOptional() @IsString() @Length(0, 300) note?: string;
}

export class ClockOutDto {
  @IsString() @Length(10, 60) employeeId!: string;
}

export class RecordAttendanceDto {
  @IsString() @Length(10, 60) employeeId!: string;
  @IsOptional() @IsString() @Matches(ISO_DATE) workDate?: string;
  @IsString() clockIn!: string;
  @IsOptional() @IsString() clockOut?: string;
  @IsIn(ATTENDANCE_STATUSES) status!: 'present' | 'late' | 'absent' | 'leave' | 'holiday';
  @IsOptional() @IsString() @Length(0, 300) note?: string;
}

export class CreatePayrollRunDto {
  @IsString() @Matches(ISO_DATE) periodStart!: string;
  @IsString() @Matches(ISO_DATE) periodEnd!: string;
  @IsOptional() @IsString() @Length(0, 300) note?: string;
}

export class UpdatePayslipDto {
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) bonusPesewas?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) deductionsPesewas?: number;
  @IsOptional() @IsString() @Length(0, 300) note?: string;
}

export class UpdatePayrollStatusDto {
  @IsIn(['approved', 'paid', 'cancelled']) status!: 'approved' | 'paid' | 'cancelled';
}

/** Admins settle refunds outside the app; this records what they did. */
export class RefundOrderDto {
  @IsInt() @Min(1) @Max(100_000_000) amountPesewas!: number;
  @IsString() @Length(3, 300) reason!: string;
}
