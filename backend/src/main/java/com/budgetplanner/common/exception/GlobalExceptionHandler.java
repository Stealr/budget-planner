package com.budgetplanner.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {
	private ResponseEntity<ErrorResponse> error(HttpStatus status, String message, HttpServletRequest request) {
		return ResponseEntity
				.status(status)
				.body(new ErrorResponse(Instant.now(), status.value(), message, request.getRequestURI()));
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<ErrorResponse> notFound(ResourceNotFoundException exception, HttpServletRequest request) {
		return error(HttpStatus.NOT_FOUND, exception.getMessage(), request);
	}

	@ExceptionHandler(BusinessConflictException.class)
	public ResponseEntity<ErrorResponse> conflict(BusinessConflictException exception, HttpServletRequest request) {
		return error(HttpStatus.CONFLICT, exception.getMessage(), request);
	}

	@ExceptionHandler({MethodArgumentNotValidException.class,MethodArgumentTypeMismatchException.class,HttpMessageNotReadableException.class})
	public ResponseEntity<ErrorResponse> invalid(Exception exception, HttpServletRequest request) {
		String message = "Invalid request";

		if (exception instanceof MethodArgumentNotValidException validation) {
			message = validation.getBindingResult().getFieldErrors()
					.stream()
					.findFirst()
					.map(f -> f.getField() + ": " + f.getDefaultMessage())
					.orElse(message);
		}

		return error(HttpStatus.BAD_REQUEST, message ,request);
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ErrorResponse> illegal(IllegalArgumentException exception, HttpServletRequest request) {
		return error(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ErrorResponse> dbConflict(DataIntegrityViolationException exception, HttpServletRequest request) {
		return error(HttpStatus.CONFLICT, "Operation violates database constraints", request);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> unexpected(Exception exception, HttpServletRequest request) {
		return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error", request);
	}
}
