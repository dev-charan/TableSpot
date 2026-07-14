const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // PostgreSQL: invalid input syntax (e.g. phone number stored in a numeric column)
  if (err.code === '22P02') {
    return res.status(400).json({ message: 'Invalid phone number format. Please enter digits only.' });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
};

module.exports = errorHandler;
