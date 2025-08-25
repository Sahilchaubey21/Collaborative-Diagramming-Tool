const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API routes to backend service
  const target = process.env.NODE_ENV === 'development' ? 'http://backend:8000' : 'http://localhost:8000';
  
  app.use(
    '/auth',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
  
  app.use(
    '/diagrams',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
  
  app.use(
    '/chat',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
  
  app.use(
    '/ai',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );

  app.use(
    '/health',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
