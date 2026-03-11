const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (req.app.get('env') === 'development') {
    console.error(err);
  }

  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : 'Error',
    message
  });
};

export default errorHandler;
