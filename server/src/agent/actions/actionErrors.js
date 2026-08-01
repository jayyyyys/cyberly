function actionError(status, code, message, errors) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (errors) error.errors = errors;
  return error;
}

module.exports = {
  actionError,
};
