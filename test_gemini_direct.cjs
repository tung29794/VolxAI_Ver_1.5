const fetch = require('node-fetch');

// Test direct API call to Google AI (như batch worker đang làm)
async function testGeminiDirectCall() {
  const apiKey = "YOUR_GOOGLE_AI_KEY"; // Thay bằng key thực từ database
  const model = "gemini-2.5-flash";
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [
      {
        parts: [{ text: "Write a short article about: test keyword" }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  };
  
  console.log('🧪 Testing Gemini Direct API Call...');
  console.log('   Model:', model);
  console.log('   URL:', url.replace(apiKey, 'KEY_HIDDEN'));
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    console.log('   Status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('\n✅ Success! Content:', content?.substring(0, 200));
    } else {
      console.log('\n❌ Error:', data);
    }
  } catch (error) {
    console.error('\n❌ Exception:', error.message);
  }
}

testGeminiDirectCall();
