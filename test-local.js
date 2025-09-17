const handler = require("./runpod-handler-integrated.js");
const fs = require("fs");

// Mock RunPod environment
process.env.USE_GPU = "false"; // Set to false for local testing
process.env.STORAGE_TYPE = "local";
process.env.EXTERNAL_DOMAIN = "http://localhost:3001";

async function testLocal() {
  console.log("🧪 Testing RunPod handler locally...");

  // Load test payload
  const testPayload = JSON.parse(
    fs.readFileSync("./test-runpod-payload.json", "utf8"),
  );

  console.log("📥 Input:", JSON.stringify(testPayload, null, 2));

  try {
    // Create mock event for testing
    const mockEvent = {
      input: testPayload.input,
    };

    console.log("⚡ Processing...");
    const startTime = Date.now();

    // Call handler directly
    const result = await handler(mockEvent);

    const totalTime = (Date.now() - startTime) / 1000;

    console.log("✅ Result:", JSON.stringify(result, null, 2));
    console.log(`⏱️ Total processing time: ${totalTime} seconds`);

    if (result.error) {
      console.error("❌ Processing failed:", result.error);
      process.exit(1);
    } else {
      console.log("🎉 Test completed successfully!");
      console.log(`📹 Video URL: ${result.output.videoUrl}`);
    }
  } catch (error) {
    console.error("💥 Test failed:", error);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testLocal();
}

module.exports = { testLocal };
