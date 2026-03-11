import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsEnum(['teacher', 'admin', 'student'])
  @IsNotEmpty()
  role: 'teacher' | 'admin' | 'student';

  // Default bor, shuning uchun ixtiyoriy
  @IsOptional()
  @IsString()
  profile_picture?: string;

  @IsOptional()
  @IsString()
  bio?: string;


  // Faqat student uchun kerak bo‘lishi mumkin, lekin hozircha ixtiyoriy qoldiramiz
  @IsOptional()
  @IsString()
  class_name?: string;

  // Faqat student uchun, null bo‘lishi mumkin
  @IsOptional()
  @IsString()
  grade?: string | null;

  // COINS faqat student bo‘lganda kerak → shartli validatsiya
  @IsOptional()
  @ValidateIf((o) => o.role === 'student') // faqat student bo‘lsa tekshiriladi
  @IsNumber()
  @Min(0)
  coins?: number;

  @IsOptional()
  @IsNumber()
  class_id: number | null;
}
