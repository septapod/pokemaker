/**
 * Error Handler Utilities
 *
 * Provides consistent error handling and user-friendly messages
 * for OpenAI API errors.
 */

export interface ErrorInfo {
  errorMessage: string;
  errorCode?: string;
}

export function handleOpenAIError(error: any): ErrorInfo {
  console.error('OpenAI Error:', {
    message: error?.message,
    status: error?.status,
    code: error?.code,
    type: error?.type,
  });

  let errorMessage = 'Failed to process request. ';
  let errorCode: string | undefined;

  if (error?.code === 'content_policy_violation') {
    errorMessage = 'This request was flagged by the safety system. Try a simpler description or different image.';
    errorCode = 'CONTENT_POLICY';
  } else if (error?.status === 401) {
    errorMessage = 'API authentication failed.';
    errorCode = 'AUTH_FAILED';
  } else if (error?.status === 429) {
    errorMessage = 'Rate limit exceeded. Please try again later.';
    errorCode = 'RATE_LIMIT';
  } else if (error?.status === 400) {
    errorMessage = 'Invalid request. ' + (error?.message || 'Please check your input.');
    errorCode = 'INVALID_REQUEST';
  } else if (error?.message) {
    errorMessage += error.message;
    errorCode = 'OPENAI_ERROR';
  } else {
    errorCode = 'UNKNOWN_ERROR';
  }

  return { errorMessage, errorCode };
}
