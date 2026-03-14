/**
 * Config Validation
 * 
 * Validates all required environment variables at startup.
 * Prevents runtime crashes from missing configuration.
 * 
 * Skill requirement: validateConfig() must be called first line of app.js
 */

const requiredVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'PORT'
];

const optionalVars = [
  'REDIS_URL', // Optional - falls back to memory store
  'JWT_EXPIRES_IN', // Optional - defaults to '15m'
  'JWT_REFRESH_EXPIRES_IN', // Optional - defaults to '7d'
  'NODE_ENV', // Optional - defaults to 'development'
];

/**
 * Validate configuration
 * Exits process with code 1 if required vars are missing
 */
function validateConfig() {
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n💡 Set these in your .env file or environment');
    process.exit(1);
  }
  
  // Warn about optional but recommended vars
  const missingOptional = optionalVars.filter(v => !process.env[v]);
  if (missingOptional.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Missing optional environment variables (using defaults):');
    missingOptional.forEach(v => console.warn(`   - ${v}`));
  }
  
  console.log('✅ All required environment variables present');
}

module.exports = { validateConfig };
