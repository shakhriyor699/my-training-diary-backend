import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePlanStatusDto {
  @ApiProperty({
    enum: PlanStatus,
    example: PlanStatus.approved,
    description: 'Training plan status',
  })
  @IsEnum(PlanStatus)
  status: PlanStatus;

  @ApiPropertyOptional({
    example: 'The plan does not meet our quality standards',
    description: 'Reason for rejection',
  })
  @IsOptional()
  @IsString()
  reason?: string; // причина отклонения
}
