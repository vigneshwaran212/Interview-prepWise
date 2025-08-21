import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

// Define the request body shape
interface InterviewRequest {
  type: string;
  role: string;
  level: string;
  techstack: string;
  amount: number;
  userid: string;
}

// Define the interview object shape
interface Interview {
  role: string;
  type: string;
  level: string;
  techstack: string[];
  questions: string[];
  userId: string;
  finalized: boolean;
  coverImage: string;
  createdAt: string;
}

// Helper function to parse and validate Gemini response
function parseGeminiResponse(text: string): string[] {
  console.log("🔍 Raw Gemini response received:", JSON.stringify(text));
  
  try {
    // Clean the response (remove markdown code blocks)
    const cleanedText = text.replace(/```json|```/g, '').trim();
    console.log("🧹 Cleaned response:", JSON.stringify(cleanedText));
    
    const parsed = JSON.parse(cleanedText);
    console.log("✅ Successfully parsed JSON:", parsed);
    
    if (!Array.isArray(parsed)) {
      console.error("❌ Parsed response is not an array:", typeof parsed, parsed);
      throw new Error("LLM output was not an array");
    }
    
    // Validate each item is a string
    const invalidItems = parsed.filter(item => typeof item !== 'string');
    if (invalidItems.length > 0) {
      console.error("❌ Array contains non-string items:", invalidItems);
      throw new Error("Array contains non-string questions");
    }
    
    console.log(`✅ Validated ${parsed.length} questions`);
    return parsed;
  } catch (parseError) {
    console.error("❌ CRITICAL: Failed to parse Gemini response");
    console.error("Parse error:", parseError);
    console.error("Original text that failed parsing:", text);
    const message = parseError instanceof Error ? parseError.message : "Unknown error";
    throw new Error(`Failed to parse LLM response: ${message}`);
  }
}

// Validate request body structure
function validateInterviewRequest(body: any): body is InterviewRequest {
  const isValid = (
    typeof body?.type === 'string' &&
    typeof body?.role === 'string' &&
    typeof body?.level === 'string' &&
    typeof body?.techstack === 'string' &&
    typeof body?.amount === 'number' &&
    typeof body?.userid === 'string'
  );
  
  if (!isValid) {
    console.error("❌ Request validation failed:", {
      type: typeof body?.type,
      role: typeof body?.role,
      level: typeof body?.level,
      techstack: typeof body?.techstack,
      amount: typeof body?.amount,
      userid: typeof body?.userid,
      actualBody: body
    });
  }
  
  return isValid;
}

export async function POST(request: Request): Promise<Response> {
  console.log("📨 POST /api/interviews received");
  
  let body: any;
  try {
    console.log("🔍 Attempting to parse request body...");
    body = await request.json();
    console.log("✅ Request body parsed:", JSON.stringify(body, null, 2));
  } catch (parseError) {
    console.error("❌ CRITICAL: Failed to parse request JSON");
    console.error("Parse error:", parseError);
    console.error("Request headers:", Object.fromEntries(request.headers));
    const message = parseError instanceof Error ? parseError.message : "Unknown parsing error";
    return Response.json(
      {
        success: false,
        error: "Invalid JSON in request body",
        details: message
      },
      { status: 400 }
    );
  }

  // Validate request structure
  if (!validateInterviewRequest(body)) {
    return Response.json(
      { 
        success: false, 
        error: "Invalid request body structure",
        received: body 
      },
      { status: 400 }
    );
  }

  const { type, role, level, techstack, amount, userid } = body;
  console.log("🎯 Processing interview request:", { type, role, level, techstack, amount, userid });

  try {
    // Call Gemini
    console.log("🤖 Calling Gemini API...");
    const { text: rawQuestions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `
        Prepare interview questions in STRICT JSON format.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        
        IMPORTANT:
        - Return ONLY a valid JSON array of strings.
        - Example output: ["Question 1", "Question 2", "Question 3"]
        - Do not include anything else (no markdown, no explanations).
        - Do not use code blocks.
      `,
    });

    console.log("✅ Gemini API call successful");
    
    // Parse and validate Gemini response
    let questions: string[];
    try {
      questions = parseGeminiResponse(rawQuestions);
      console.log(`📋 Generated ${questions.length} questions`);
    } catch (parseError) {
      console.error("❌ CRITICAL: Gemini response parsing failed");
      console.error("Raw Gemini output that caused error:", rawQuestions);
      const message = parseError instanceof Error ? parseError.message : "Unknown parsing error";
      return Response.json(
        {
          success: false,
          error: "Failed to process AI response",
          details: message,
          rawResponse: rawQuestions
        },
        { status: 500 }
      );
    }

    // Create interview object
    const interview: Interview = {
      role,
      type,
      level,
      techstack: techstack.split(",").map((t) => t.trim()),
      questions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    console.log("💾 Saving to Firestore...", interview);

    // Save to Firestore
    try {
      await db.collection("interviews").add(interview);
      console.log("✅ Successfully saved to Firestore");
    } catch (firestoreError) {
      console.error("❌ CRITICAL: Firestore save failed");
      console.error("Firestore error:", firestoreError);
      console.error("Interview data that failed to save:", interview);
      throw firestoreError;
    }

    return Response.json({ 
      success: true,
      questionsCount: questions.length 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("❌ CRITICAL: Unhandled error in POST /interviews");
    console.error("Error object:", error);
    
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
    }

    const message = error instanceof Error ? error.message : "Unknown server error";

    return Response.json({ 
      success: false, 
      error: "Internal server error",
      details: message 
    }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  console.log("📨 GET /api/interviews received");
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}