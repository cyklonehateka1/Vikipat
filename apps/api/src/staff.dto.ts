import { IsBoolean, IsEmail, IsIn, IsString, Length, Matches } from 'class-validator';
import { STAFF_ROLES, StaffRole } from '@vikipat/domain';

export class CreateStaffDto {
  @IsEmail() @Length(3,254) email!: string;
  @IsString() @Length(2,120) @Matches(/\S/) name!: string;
  @IsIn(STAFF_ROLES) role!: StaffRole;
  @IsString() @Length(12,72) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/) temporaryPassword!: string;
}
export class UpdateStaffDto {
  @IsIn(STAFF_ROLES) role!: StaffRole;
  @IsBoolean() isActive!: boolean;
}
