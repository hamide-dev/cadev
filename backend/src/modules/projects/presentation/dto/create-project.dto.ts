import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProjectStatus } from '../../domain/project.types.js';

export class CreateProjectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  repositoryUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  technologies?: string[];

  @IsOptional()
  @IsBoolean()
  isBeginnerFriendly?: boolean;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export class UpdateProjectDto extends CreateProjectDto {}

export class CreateProjectTaskDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  acceptanceCriteria?: string[];

  @IsOptional()
  @IsBoolean()
  isBeginnerFriendly?: boolean;
}

export class UpdateProjectTaskDto extends CreateProjectTaskDto {}

export class CreateProjectContributionDto {
  @IsOptional()
  @IsUUID('4')
  taskId?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
