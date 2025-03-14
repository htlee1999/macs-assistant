// Enhanced debugging for database connection
import { Pool, PoolClient } from 'pg';

// Start with immediate console output
console.log("===== SCRIPT STARTING =====");

// Replace this with your actual database URL
const databaseURL = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/dbname';
console.log("Database URL configured (masked):", databaseURL.replace(/:[^:]*@/, ":****@"));

// Create a promise that resolves after a timeout to ensure we don't hang
const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testConnection(): Promise<boolean> {
  console.log("Starting connection test...");
  const pool = new Pool({
    connectionString: databaseURL,
  });
  console.log("Pool created");
  
  let client: PoolClient | undefined;
  
  try {
    console.log("Attempting to connect to database...");
    client = await Promise.race([
      pool.connect(),
      timeout(5000).then(() => {
        throw new Error("Connection timeout after 5 seconds");
      })
    ]) as PoolClient;
    
    console.log('✅ Connection successful!');
    
    console.log("Attempting query...");
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query successful! Current timestamp:', result.rows[0].now);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error details:', (error as Error).message);
    console.error('Error object:', error);
    
    // Help diagnose common URL issues
    try {
      const url = new URL(databaseURL);
      console.log('\nAnalyzing connection string:');
      console.log(`- Protocol: ${url.protocol} (should be postgresql:)`);
      console.log(`- Username: ${url.username}`);
      console.log(`- Password: ${url.password ? '****' : 'None provided'}`);
      console.log(`- Host: ${url.hostname}`);
      console.log(`- Port: ${url.port || '5432 (default)'}`);
      console.log(`- Database name: ${url.pathname.slice(1)}`);
    } catch (urlError) {
      console.error('Invalid connection string format:', urlError);
    }
    
    return false;
  } finally {
    console.log("In finally block");
    if (client) {
      console.log("Releasing client");
      client.release();
    }
    console.log("Ending pool");
    await pool.end();
    console.log("Pool ended");
  }
}

// Execute the test with a wrapper to catch any unhandled errors
(async () => {
  console.log("Starting main function execution");
  try {
    const success = await testConnection();
    console.log("Test completed with result:", success);
    if (!success) {
      console.log("Exiting with error code 1");
      process.exit(1);
    }
  } catch (err) {
    console.error("Unexpected fatal error:", err);
    process.exit(1);
  } finally {
    console.log("===== SCRIPT FINISHED =====");
  }
})();

// Add handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});