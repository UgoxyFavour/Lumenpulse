import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from './global-exception.filter';
import {
  HttpException,
  HttpStatus,
  ArgumentsHost,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '../common/enums/error-code.enum';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockRequest = {
    url: '/test-path',
  };

  const mockArgumentsHost = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as unknown as ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle standard HttpException and include errorCode', () => {
    const errorMsg = 'Not Found';
    const exception = new HttpException(errorMsg, HttpStatus.NOT_FOUND);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: errorMsg,
        errorCode: ErrorCode.SYS_NOT_FOUND,
        path: '/test-path',
      }),
    );
  });

  it('should handle UnauthorizedException and return AUTH_001', () => {
    const exception = new UnauthorizedException();

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ErrorCode.AUTH_UNAUTHORIZED,
      }),
    );
  });

  it('should handle validation errors (BadRequestException) and return SYS_004', () => {
    const exception = new BadRequestException({
      error: 'Validation Failed',
      message: ['Email is required'],
    });

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ErrorCode.SYS_VALIDATION_FAILED,
        message: ['Email is required'],
      }),
    );
  });

  it('should pick up custom errorCode from exception response', () => {
    const exception = new HttpException(
      {
        message: 'Custom error',
        errorCode: ErrorCode.STEL_INSUFFICIENT_FUNDS,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ErrorCode.STEL_INSUFFICIENT_FUNDS,
      }),
    );
  });

  it('should handle generic Error and return SYS_001', () => {
    const exception = new Error('Unexpected database error');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        errorCode: ErrorCode.SYS_INTERNAL_ERROR,
        message: 'Unexpected database error',
      }),
    );
  });
});
