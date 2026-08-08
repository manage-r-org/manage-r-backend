import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RefreshTokenDto } from './refresh-token.dto';

async function validationMessages(input: object): Promise<string[]> {
  const dto = plainToInstance(RefreshTokenDto, input);
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('RefreshTokenDto', () => {
  it('accepts a valid refresh token payload', async () => {
    const messages = await validationMessages({
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example',
    });

    expect(messages).toHaveLength(0);
  });

  it('requires a refreshToken', async () => {
    const messages = await validationMessages({});

    expect(messages.join(' ')).toContain('refreshToken');
  });

  it('rejects an empty refreshToken', async () => {
    const messages = await validationMessages({ refreshToken: '' });

    expect(messages.join(' ')).toContain('refreshToken');
  });

  it('rejects a non-string refreshToken', async () => {
    const messages = await validationMessages({ refreshToken: 12345 });

    expect(messages.join(' ')).toContain('refreshToken');
  });

  it('rejects privileged client fields through the global validation pipe', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    const payload = {
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example',
      userId: '1',
      role: 'ADMIN',
      accessToken: 'another-token',
      password: 'StrongP@ss123',
    };

    await expect(
      pipe.transform(payload, { type: 'body', metatype: RefreshTokenDto }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
