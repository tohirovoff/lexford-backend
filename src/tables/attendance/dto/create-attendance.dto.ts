import {
  IsInt,
  IsString,
  IsArray,
  IsOptional,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';

export class CreateAttendanceDto {
  @IsInt()
  class_id: number;

  @IsInt()
  teacher_id: number;

  @IsDateString()
  date: string; // ISO format: '2025-12-24'

  @IsString()
  @IsOptional()
  subject?: string;

  @IsArray()
  @IsInt({ each: true })
  present_student_ids: number[]; // [15, 7, 14, ...]

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  late_student_ids?: number[]; // Kechikkan o'quvchilar [3, 5, ...]
}
