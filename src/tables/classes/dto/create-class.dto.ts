import { IsNotEmpty, IsNumber, IsSemVer, IsString } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsNumber()
  @IsNotEmpty()
  teacher_id: number;
}
